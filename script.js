// ==================== ⚙️ 这里是运行逻辑代码，以后再也不用动它了 ============================
let currentIdx = -1; 
let saved = JSON.parse(localStorage.getItem('saved_104')) || [];
let quizData = [];
let currentQuizIdx = 0;
let isLocked = false;

window.onload = function() {
    document.getElementById('articleTitle').innerText = lessonTitle;
    document.title = lessonTitle;

    if (typeof lessonData !== 'undefined') { 
        render(); 
        renderNB(); 
    }
    document.body.appendChild(document.getElementById('buddyPopover'));
    document.addEventListener('click', () => { 
        document.getElementById('buddyPopover').style.display = 'none'; 
        document.querySelectorAll('ruby').forEach(r => r.classList.remove('is-active'));
    });
};

function render() {
    const cnt = document.getElementById('content'); 
    cnt.innerHTML = "";
    let pNum = 1; 
    let p = document.createElement("p"); 
    
    function finalizeParagraph(paragraphElement) {
        if (paragraphElement.childNodes.length === 0) return;
        
        const textContent = paragraphElement.innerText.trim();
        const isAuthorLineAtEnd = (textContent.startsWith("（") && textContent.includes("《"));
        
        if (isAuthorLineAtEnd) {
            paragraphElement.style.textIndent = "0";
            paragraphElement.style.textAlign = "right";  
            paragraphElement.style.color = "#7f8c8d";    
            paragraphElement.style.fontSize = "15px";     
            paragraphElement.style.marginTop = "30px";    
        } else {
            let s = document.createElement("span");
            s.className = "p-index";
            s.innerText = "第" + pNum + "段";
            paragraphElement.insertBefore(s, paragraphElement.firstChild); 
            pNum++; 
        }
        cnt.appendChild(paragraphElement);
    }

    lessonData.forEach((d, i) => {
        if (d[0] === "\n") { 
            finalizeParagraph(p);
            p = document.createElement("p"); 
        }
        else if (d[1] === "") { 
            let s = document.createElement("span"); 
            s.innerText = d[0]; 
            p.appendChild(s); 
        }
        else {
            let r = document.createElement("ruby"); 
            r.setAttribute("data-word-index", i);
            r.onclick = (e) => { 
                e.stopPropagation(); 
                document.querySelectorAll('ruby').forEach(x=>x.classList.remove('is-active')); 
                r.classList.add('is-active'); 
                openPop(e.currentTarget, i); 
            };
            r.innerHTML = `${d[0]}<rt>${d[1]}</rt>`; 
            p.appendChild(r);
        }
    });
    finalizeParagraph(p);
}

function openPop(el, i) {
    currentIdx = i; 
    const d = lessonData[i];
    document.getElementById('popWord').innerText = d[0];
    document.getElementById('popPinyin').innerText = `[${d[1]}]`;
    document.getElementById('popEn').innerText = d[2];
    document.getElementById('popBm').innerText = d[3];
    
    const pop = document.getElementById('buddyPopover');
    const arrow = document.getElementById('popArrow');
    pop.style.display = 'block';
    
    const rect = el.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    let top = rect.top - popRect.height - 15;
    let left = rect.left + (rect.width / 2) - (popRect.width / 2);
    const margin = 15;
    
    if (left + popRect.width > window.innerWidth - margin) left = window.innerWidth - popRect.width - margin;
    if (left < margin) left = margin;
    
    arrow.style.left = `${(rect.left + rect.width / 2) - left}px`;
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
}

function saveToNotebook(e) {
    e.stopPropagation();
    if (!saved.includes(currentIdx)) { 
        saved.push(currentIdx); 
        localStorage.setItem('saved_104', JSON.stringify(saved)); 
        renderNB(); 
    }
    const btn = e.target; 
    btn.innerText = "✓ 已存";
    setTimeout(() => btn.innerText = "Copy 📋", 1000);
}

function renderNB() {
    const list = document.getElementById('notebookList');
    if (saved.length === 0) { 
        list.innerHTML = "<span style='color:#999; font-size:13px;'>点击词语 Copy 记录生词</span>"; 
    } 
    else {
        list.innerHTML = "";
        saved.forEach(idx => {
            const item = lessonData[idx]; 
            if(!item) return;
            const div = document.createElement("div"); 
            div.className = "notebook-item"; 
            div.innerText = item[0];
            div.onclick = (e) => {
                e.stopPropagation();
                const target = document.querySelector(`ruby[data-word-index="${idx}"]`);
                if(target) {
                    target.scrollIntoView({behavior: "smooth", block: "center"});
                    document.querySelectorAll('ruby').forEach(r => r.classList.remove('is-active'));
                    setTimeout(() => { 
                        target.classList.add('is-active'); 
                        openPop(target, idx); 
                    }, 500);
                }
            };
            list.appendChild(div);
        });
    }
}

function forceClearNotebook() { 
    localStorage.removeItem('saved_104'); 
    saved = []; 
    renderNB(); 
    document.getElementById('gameContainer').style.display = 'none'; 
    document.getElementById('gameToggleBtn').innerText = "🎯 生词测试"; 
}

function toggleGameMode() {
    const container = document.getElementById('gameContainer');
    const btn = document.getElementById('gameToggleBtn');
    if (container.style.display === 'block') { 
        container.style.display = 'none'; 
        btn.innerText = "🎯 生词测试"; 
    }
    else {
        if (saved.length < 1) { 
            alert("生词本是空的哦！"); 
            return; 
        }
        container.style.display = 'block'; 
        btn.innerText = "📖 返回课文";
        startQuizGame();
        container.scrollIntoView({behavior: "smooth"});
    }
}

function startQuizGame() {
    quizData = [...saved].sort(() => Math.random() - 0.5);
    currentQuizIdx = 0;
    loadQuestion();
}

function loadQuestion() {
    isLocked = false;
    const targetIdx = quizData[currentQuizIdx];
    const data = lessonData[targetIdx];
    
    document.getElementById('quizProgress').innerText = `第 ${currentQuizIdx + 1} / ${quizData.length} 题`;
    document.getElementById('quizQuestion').innerText = data[0];
    document.getElementById('quizPinyin').innerText = `[${data[1]}]`;
    
    const correctStr = (data[2].trim() + "；" + data[3].trim());
    let options = [correctStr];
    
    let others = lessonData
        .filter(d => d[1] !== "" && d[0] !== data[0])
        .map(d => (d[2].trim() + "；" + d[3].trim()));
    
    others = [...new Set(others)].filter(s => s !== correctStr).sort(() => Math.random() - 0.5);
    
    for(let i=0; i<3; i++) { 
        if(others[i]) options.push(others[i]); 
    }
    options.sort(() => Math.random() - 0.5);

    const optDiv = document.getElementById('quizOptions');
    optDiv.innerHTML = "";
    options.forEach(opt => {
        const b = document.createElement('button');
        b.className = 'quiz-opt-btn';
        b.innerText = opt;
        b.onclick = () => {
            if(isLocked || b.classList.contains('wrong')) return;
            if(opt.trim() === correctStr.trim()) {
                isLocked = true;
                b.classList.add('correct');
                setTimeout(() => {
                    currentQuizIdx++;
                    if(currentQuizIdx < quizData.length) loadQuestion();
                    else { 
                        alert("🎉 完成测试！你真棒！"); 
                        toggleGameMode(); 
                    }
                }, 800);
            } else {
                b.classList.add('wrong');
            }
        };
        optDiv.appendChild(b);
    });
}

function togglePinyin() { 
    document.getElementById('content').classList.toggle('hide-pinyin'); 
    document.getElementById('pyToggle').classList.toggle('active'); 
}

function toggleTheme() { 
    document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme')==='dark'?'':'dark'); 
}
