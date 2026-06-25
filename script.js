// ==========================================================================
// ⚙️ 全互动式华文教学系统阅读器大脑 - script.js (2026 最终GitHub生产环境版)
// ==========================================================================

let currentIdx = -1; 
let saved = JSON.parse(localStorage.getItem('saved_104')) || [];
let quizData = [];
let currentQuizIdx = 0;
let isLocked = false;

window.onload = function() {
    // 动态渲染页面大标题与网页标签标题
    document.getElementById('articleTitle').innerText = lessonTitle;
    document.title = lessonTitle;

    if (typeof lessonData !== 'undefined') { 
        render(); 
        renderNB(); 
        renderQuestions(); // 启动全互动习题区
    }
    document.body.appendChild(document.getElementById('buddyPopover'));
    document.addEventListener('click', () => { 
        document.getElementById('buddyPopover').style.display = 'none'; 
        document.querySelectorAll('ruby').forEach(r => r.classList.remove('is-active'));
    });
};

// 📖 正文渲染器（含拼音、标点符号融合与末段出处右对齐识别）
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
            paragraphElement.style.textAlign = "right";  // 强制右对齐
            paragraphElement.style.color = "#7f8c8d";    // 出处灰色
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

// 🧠 核心习题区：支持字数实时统计、本地保存、与高精度原子级修复版 Gemini API 批改
function renderQuestions() {
    if (typeof lessonQuestions === 'undefined' || lessonQuestions.length === 0) return;

    const cnt = document.getElementById('content');

    const qCard = document.createElement("div");
    qCard.style.marginTop = "40px";
    qCard.style.padding = "25px";
    qCard.style.borderTop = "2px dashed #bdc3c7";
    qCard.style.background = "var(--card-bg, #ffffff)";
    qCard.style.borderRadius = "12px";

    const qTitle = document.createElement("h2");
    qTitle.innerText = "📚 课后思考与 AI 智能练习";
    qTitle.style.fontSize = "20px";
    qTitle.style.color = "#2c3e50";
    qTitle.style.marginBottom = "20px";
    qCard.appendChild(qTitle);

    lessonQuestions.forEach((q) => {
        const qBox = document.createElement("div");
        qBox.style.marginBottom = "30px";
        qBox.style.paddingBottom = "20px";
        qBox.style.borderBottom = "1px dashed #eee";

        const qText = document.createElement("div");
        qText.innerHTML = `<strong>${q.number}</strong> ${q.question} <span style="color:#e74c3c; font-weight:bold;">[${q.score}分]</span>`;
        qText.style.fontSize = "16px";
        qBox.appendChild(qText);

        if (q.type === "summary") {
            const block = document.createElement("blockquote");
            block.innerText = q.context;
            block.style.background = "#f8f9fa";
            block.style.borderLeft = "4px solid #3498db";
            block.style.padding = "12px 15px";
            block.style.margin = "10px 0";
            block.style.fontSize = "14px";
            block.style.color = "#555";
            block.style.borderRadius = "4px";
            qBox.appendChild(block);
        }

        const textarea = document.createElement("textarea");
        textarea.placeholder = q.type === "summary" ? "请在此处输入您的概述答案（注意不超过60字）..." : "请在此处输入您的答案...";
        textarea.style.width = "100%";
        textarea.style.height = q.type === "summary" ? "110px" : "80px";
        textarea.style.padding = "10px";
        textarea.style.marginTop = "10px";
        textarea.style.boxSizing = "border-box";
        textarea.style.borderRadius = "6px";
        textarea.style.border = "1px solid #ccc";
        textarea.style.fontSize = "15px";
        textarea.style.fontFamily = "inherit";

        textarea.value = localStorage.getItem(`ans_${q.id}`) || "";
        qBox.appendChild(textarea);

        const controlRow = document.createElement("div");
        controlRow.style.display = "flex";
        controlRow.style.justify = "space-between";
        controlRow.style.alignItems = "center";
        controlRow.style.marginTop = "8px";

        const counter = document.createElement("div");
        counter.style.fontSize = "13px";
        counter.style.color = "#7f8c8d";
        if (q.type === "summary") {
            counter.innerHTML = `当前字数：<span id="charCount_${q.id}">0</span> / 60 字`;
        }
        controlRow.appendChild(counter);

        const btnGroup = document.createElement("div");

        const aiBtn = document.createElement("button");
        aiBtn.innerText = "🤖 AI 批改结果";
        aiBtn.style.padding = "6px 12px";
        aiBtn.style.background = "#9b59b6";
        aiBtn.style.color = "white";
        aiBtn.style.border = "none";
        aiBtn.style.borderRadius = "4px";
        aiBtn.style.cursor = "pointer";
        aiBtn.style.fontSize = "13px";
        aiBtn.style.marginRight = "8px";
        btnGroup.appendChild(aiBtn);

        const submitBtn = document.createElement("button");
        submitBtn.innerText = "查看标准答案 📋";
        submitBtn.style.padding = "6px 12px";
        submitBtn.style.background = "#2ecc71";
        submitBtn.style.color = "white";
        submitBtn.style.border = "none";
        submitBtn.style.borderRadius = "4px";
        submitBtn.style.cursor = "pointer";
        submitBtn.style.fontSize = "13px";
        btnGroup.appendChild(submitBtn);

        controlRow.appendChild(btnGroup);
        qBox.appendChild(controlRow);

        const ansBox = document.createElement("div");
        ansBox.style.display = "none";
        ansBox.style.marginTop = "15px";
        ansBox.style.padding = "12px";
        ansBox.style.background = "#fff9db";
        ansBox.style.borderLeft = "4px solid #f1c40f";
        ansBox.style.borderRadius = "4px";
        ansBox.style.fontSize = "14px";
        ansBox.innerHTML = `<strong>💡 评分标准与参考答案：</strong><br><div style="margin-top:6px;">${q.modelAnswer}</div>`;
        qBox.appendChild(ansBox);

        const aiBox = document.createElement("div");
        aiBox.style.display = "none";
        aiBox.style.marginTop = "15px";
        aiBox.style.padding = "12px";
        aiBox.style.background = "#ebf5fb";
        aiBox.style.borderLeft = "4px solid #3498db";
        aiBox.style.borderRadius = "4px";
        aiBox.style.fontSize = "14px";
        qBox.appendChild(aiBox);

        submitBtn.onclick = function() {
            ansBox.style.display = ansBox.style.display === "none" ? "block" : "none";
            submitBtn.innerText = ansBox.style.display === "block" ? "收起标准答案 ❌" : "查看标准答案 📋";
        };

        // 🚀 核心修复：纯变量拼接字符串，杜绝 404 网址路径跑偏 Bug
        aiBtn.onclick = async function() {
            const studentAns = textarea.value.trim();
            if (!studentAns) {
                alert("请先输入您的作答，再让 AI 老师批改哦！");
                return;
            }

            let apiKey = localStorage.getItem("gemini_api_key");
            if (!apiKey) {
                apiKey = prompt("🤖 首次使用请输入您的 Gemini API Key:\n（密钥将安全保存在您的本地浏览器中）");
                if (!apiKey) return;
                localStorage.setItem("gemini_api_key", apiKey.trim());
            }

            aiBox.style.display = "block";
            aiBox.innerHTML = "<span style='color:#34495e;'>⏳ AI 老师正在仔细审阅您的作答并核对采分点，请稍候...</span>";
            aiBtn.disabled = true;

            const promptText = `你是一位严谨的华文老师。请阅读以下题目、评分标准以及学生的作答，做出极其专业的批改。
题目：${q.question} [满分 ${q.score} 分]
${q.type === 'summary' ? `背景短文：${q.context}` : ''}
参考评分标准：${q.modelAnswer}

学生作答："${studentAns}"

请直接用以下格式输出批改报告，不要废话：
<strong>【AI 评定得分】</strong>：X / ${q.score} 分
<strong>【得分点拆解】</strong>：(简述学生写对了哪些采分点，扣分点在哪)
<strong>【给同学的改进建议】</strong>：(一两句精炼的评语)`;

            try {
                // 🎯 采用安全的“+”拼接，防止因反引号模板引发任何隐式路径错位
                const targetUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

                const response = await fetch(targetUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error ? errData.error.message : "API 连接被服务器拒绝");
                }

                const data = await response.json();
                let aiReply = "";
                if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                    aiReply = data.candidates[0].content.parts[0].text;
                } else {
                    throw new Error("返回的数据结构异常，请检查 API 状态。");
                }
                
                let formattedReply = aiReply
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>');

                aiBox.innerHTML = `<strong>🤖 AI 老师线上批改报告：</strong><br><div style="margin-top:8px; white-space: pre-line; line-height:1.6; color:#2c3e50;">${formattedReply}</div>`;
            } catch (err) {
                aiBox.innerHTML = `<span style='color:#e74c3c;'>❌ 批改失败！<br>
                <strong>可能原因：</strong>密钥复制不全、带了隐形字符或已失效。<br>
                <strong>技术报错原因：</strong>${err.message || err}</span>`;
                console.error(err);
            } finally {
                aiBtn.disabled = false;
            }
        };

        // 高精度华文计字函数
        function updateCharCount() {
            if (q.type === "summary") {
                const text = textarea.value;
                const matched = text.match(/[\u4e00-\u9fa5\w\d\u3000-\u303f\uff00-\uffef]/g);
                const count = matched ? matched.length : 0;
                const countEl = document.getElementById(`charCount_${q.id}`);
                if (countEl) {
                    countEl.innerText = count;
                    countEl.style.color = count > 60 ? "#e74c3c" : "#27ae60";
                }
            }
        }
        
        textarea.oninput = function() {
            localStorage.setItem(`ans_${q.id}`, textarea.value);
            updateCharCount();
        };
        setTimeout(updateCharCount, 100);

        qCard.appendChild(qBox);
    });

    cnt.appendChild(qCard);
}

// ==================== 🛠️ 以下维持原有的字典与生词本/小游戏测试逻辑 ============================
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
