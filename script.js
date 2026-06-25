// ==========================================================================
// ⚙️ 全互动式华文教学系统阅读器大脑 - script.js (2026 稳定版)
// ==========================================================================

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
        renderQuestions(); 
    }
    document.body.appendChild(document.getElementById('buddyPopover'));
    document.addEventListener('click', () => { 
        document.getElementById('buddyPopover').style.display = 'none'; 
        document.querySelectorAll('ruby').forEach(r => r.classList.remove('is-active'));
    });
};

// 📖 渲染课文正文
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
        if (d[0] === "\n") { finalizeParagraph(p); p = document.createElement("p"); }
        else if (d[1] === "") { let s = document.createElement("span"); s.innerText = d[0]; p.appendChild(s); }
        else {
            let r = document.createElement("ruby"); 
            r.setAttribute("data-word-index", i);
            r.onclick = (e) => { e.stopPropagation(); document.querySelectorAll('ruby').forEach(x=>x.classList.remove('is-active')); r.classList.add('is-active'); openPop(e.currentTarget, i); };
            r.innerHTML = `${d[0]}<rt>${d[1]}</rt>`; 
            p.appendChild(r);
        }
    });
    finalizeParagraph(p);
}

// 🧠 核心：渲染习题区域（采用跳转式 AI 交互）
function renderQuestions() {
    if (typeof lessonQuestions === 'undefined' || lessonQuestions.length === 0) return;
    const cnt = document.getElementById('content');
    const qCard = document.createElement("div");
    qCard.style.marginTop = "40px"; qCard.style.padding = "25px";
    qCard.style.borderTop = "2px dashed #bdc3c7"; qCard.style.background = "#fff";
    qCard.style.borderRadius = "12px";

    const qTitle = document.createElement("h2");
    qTitle.innerText = "📚 课后思考与 AI 智能练习";
    qCard.appendChild(qTitle);

    lessonQuestions.forEach((q) => {
        const qBox = document.createElement("div");
        qBox.style.marginBottom = "30px";
        qBox.innerHTML = `<strong>${q.number}</strong> ${q.question} <span style="color:#e74c3c;">[${q.score}分]</span>`;
        
        if (q.type === "summary") {
            const block = document.createElement("blockquote");
            block.innerText = q.context;
            block.style.background = "#f8f9fa"; block.style.padding = "10px"; block.style.borderLeft = "4px solid #3498db";
            qBox.appendChild(block);
        }

        const textarea = document.createElement("textarea");
        textarea.style.width = "100%"; textarea.style.height = "100px"; textarea.style.marginTop = "10px";
        textarea.value = localStorage.getItem(`ans_${q.id}`) || "";
        qBox.appendChild(textarea);

        const btnGroup = document.createElement("div");
        btnGroup.style.marginTop = "10px";

        // 🤖 一键跳转批改按钮
        const aiBtn = document.createElement("button");
        aiBtn.innerText = "🤖 跳转 AI 批改";
        aiBtn.style.background = "#9b59b6"; aiBtn.style.color = "white"; aiBtn.style.padding = "8px 15px"; aiBtn.style.border = "none"; aiBtn.style.borderRadius = "4px"; aiBtn.style.cursor = "pointer";
        aiBtn.onclick = function() {
            const val = textarea.value.trim();
            if(!val){ alert("请先写答案！"); return; }
            const prompt = `题目：${q.question}。评分标准：${q.modelAnswer}。我的答案：${val}。请批改并给出得分和建议。`;
            window.open(`https://gemini.google.com/app?q=${encodeURIComponent(prompt)}`, '_blank');
        };

        const submitBtn = document.createElement("button");
        submitBtn.innerText = "查看标准答案 📋";
        submitBtn.style.marginLeft = "10px"; submitBtn.style.padding = "8px 15px";
        submitBtn.onclick = () => { ansBox.style.display = ansBox.style.display === "none" ? "block" : "none"; };

        btnGroup.appendChild(aiBtn); btnGroup.appendChild(submitBtn);
        qBox.appendChild(btnGroup);

        const ansBox = document.createElement("div");
        ansBox.style.display = "none"; ansBox.style.marginTop = "10px"; ansBox.style.padding = "10px"; ansBox.style.background = "#fff9db";
        ansBox.innerHTML = `<strong>标准答案：</strong><br>${q.modelAnswer}`;
        qBox.appendChild(ansBox);
        
        textarea.oninput = () => localStorage.setItem(`ans_${q.id}`, textarea.value);
        qCard.appendChild(qBox);
    });
    cnt.appendChild(qCard);
}

// 🛠️ 辅助逻辑工具
function openPop(el, i) {
    currentIdx = i; const d = lessonData[i];
    document.getElementById('popWord').innerText = d[0];
    document.getElementById('popPinyin').innerText = `[${d[1]}]`;
    document.getElementById('popEn').innerText = d[2];
    document.getElementById('popBm').innerText = d[3];
    const pop = document.getElementById('buddyPopover');
    pop.style.display = 'block';
    const rect = el.getBoundingClientRect();
    pop.style.top = `${rect.top - 120}px`; pop.style.left = `${rect.left}px`;
}

function saveToNotebook(e) { e.stopPropagation(); if (!saved.includes(currentIdx)) { saved.push(currentIdx); localStorage.setItem('saved_104', JSON.stringify(saved)); renderNB(); } }
function renderNB() { const list = document.getElementById('notebookList'); if (saved.length === 0) list.innerHTML = "点击词语记录生词"; else { list.innerHTML = ""; saved.forEach(idx => { const div = document.createElement("div"); div.className = "notebook-item"; div.innerText = lessonData[idx][0]; list.appendChild(div); }); } }
function forceClearNotebook() { localStorage.removeItem('saved_104'); saved = []; renderNB(); }
function toggleGameMode() { document.getElementById('gameContainer').style.display = document.getElementById('gameContainer').style.display === 'block' ? 'none' : 'block'; }
function togglePinyin() { document.getElementById('content').classList.toggle('hide-pinyin'); }
function toggleTheme() { document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme')==='dark'?'':'dark'); }
