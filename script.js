// ==========================================================================
// ⚙️ 华文教学系统阅读器大脑 - script.js (Gemini API 免费接口版)
// ==========================================================================

let currentIdx = -1; 
let saved = JSON.parse(localStorage.getItem('saved_104')) || [];
let quizData = [];
let currentQuizIdx = 0;
let isLocked = false;

window.onload = function() {
    document.getElementById('articleTitle').innerText = lessonTitle;
    document.title = lessonTitle;
    if (typeof lessonData !== 'undefined') { render(); renderNB(); renderQuestions(); }
    document.body.appendChild(document.getElementById('buddyPopover'));
    document.addEventListener('click', () => { 
        document.getElementById('buddyPopover').style.display = 'none'; 
        document.querySelectorAll('ruby').forEach(r => r.classList.remove('is-active'));
    });
};

function render() {
    const cnt = document.getElementById('content'); cnt.innerHTML = "";
    let pNum = 1; let p = document.createElement("p"); 
    function finalizeParagraph(pe) {
        if (pe.childNodes.length === 0) return;
        const txt = pe.innerText.trim();
        if (txt.startsWith("（") && txt.includes("《")) {
            pe.style.textAlign = "right"; pe.style.color = "#7f8c8d";
        } else {
            let s = document.createElement("span");
            s.className = "p-index"; s.innerText = "第" + pNum + "段";
            pe.insertBefore(s, pe.firstChild); pNum++; 
        }
        cnt.appendChild(pe);
    }
    lessonData.forEach((d, i) => {
        if (d[0] === "\n") { finalizeParagraph(p); p = document.createElement("p"); }
        else if (d[1] === "") { let s = document.createElement("span"); s.innerText = d[0]; p.appendChild(s); }
        else {
            let r = document.createElement("ruby"); r.setAttribute("data-word-index", i);
            r.onclick = (e) => { e.stopPropagation(); document.querySelectorAll('ruby').forEach(x=>x.classList.remove('is-active')); r.classList.add('is-active'); openPop(e.currentTarget, i); };
            r.innerHTML = `${d[0]}<rt>${d[1]}</rt>`; p.appendChild(r);
        }
    });
    finalizeParagraph(p);
}

function renderQuestions() {
    if (typeof lessonQuestions === 'undefined') return;
    const cnt = document.getElementById('content');
    const qCard = document.createElement("div");
    qCard.style.marginTop = "40px"; qCard.style.padding = "25px";
    qCard.style.borderTop = "2px dashed #bdc3c7"; qCard.style.background = "#fff";
    qCard.style.borderRadius = "12px";
    qCard.innerHTML = "<h2>📚 课后思考与 AI 智能练习</h2>";

    lessonQuestions.forEach((q) => {
        const qBox = document.createElement("div");
        qBox.style.marginBottom = "30px";
        qBox.innerHTML = `<strong>${q.number}</strong> ${q.question} <span style="color:#e74c3c;">[${q.score}分]</span>`;
        
        const textarea = document.createElement("textarea");
        textarea.style.width = "100%"; textarea.style.height = "100px"; textarea.style.marginTop = "10px";
        textarea.value = localStorage.getItem(`ans_${q.id}`) || "";
        qBox.appendChild(textarea);

        const btnGroup = document.createElement("div");
        const aiBtn = document.createElement("button");
        aiBtn.innerText = "🤖 AI 批改结果";
        aiBtn.style.background = "#9b59b6"; aiBtn.style.color = "white"; aiBtn.style.padding = "8px 15px"; aiBtn.style.border = "none"; aiBtn.style.borderRadius = "4px"; aiBtn.style.cursor = "pointer";
        
        // 核心：调用 Gemini API 免费层接口
        aiBtn.onclick = async function() {
            const val = textarea.value.trim();
            if(!val){ alert("请先写答案！"); return; }
            let key = localStorage.getItem("gemini_api_key");
            if (!key) { key = prompt("请输入 API Key:"); if(!key) return; localStorage.setItem("gemini_api_key", key.trim()); }

            aiBox.style.display = "block"; aiBox.innerText = "⏳ AI 正在批改..."; aiBtn.disabled = true;

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: `题目：${q.question}\n评分标准：${q.modelAnswer}\n学生作答：${val}\n请给出简短的得分和建议。` }] }] })
                });
                const data = await response.json();
                if (data.candidates && data.candidates[0].content.parts[0].text) {
                    aiBox.innerHTML = `<strong>AI 批改报告：</strong><br>${data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}`;
                } else { throw new Error("API 解析失败"); }
            } catch (err) { aiBox.innerText = "❌ 批改失败: " + err.message; } finally { aiBtn.disabled = false; }
        };

        btnGroup.appendChild(aiBtn); qBox.appendChild(btnGroup);
        const aiBox = document.createElement("div"); aiBox.style.marginTop = "10px"; aiBox.style.display = "none";
        qBox.appendChild(aiBox); qCard.appendChild(qBox);
        textarea.oninput = () => localStorage.setItem(`ans_${q.id}`, textarea.value);
    });
    cnt.appendChild(qCard);
}

function openPop(el, i) {
    currentIdx = i; const d = lessonData[i];
    document.getElementById('popWord').innerText = d[0];
    document.getElementById('popPinyin').innerText = `[${d[1]}]`;
    const pop = document.getElementById('buddyPopover');
    pop.style.display = 'block';
    const rect = el.getBoundingClientRect();
    pop.style.top = `${rect.top - 120}px`; pop.style.left = `${rect.left}px`;
}

function renderNB() { const list = document.getElementById('notebookList'); if (saved.length === 0) list.innerHTML = "点击词语记录生词"; else { list.innerHTML = ""; saved.forEach(idx => { const div = document.createElement("div"); div.className = "notebook-item"; div.innerText = lessonData[idx][0]; list.appendChild(div); }); } }
function toggleTheme() { document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme')==='dark'?'':'dark'); }
