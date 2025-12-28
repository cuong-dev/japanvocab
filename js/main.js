let originalContent = "";
function openTab(evt, tabName) {
    // 1. Ngăn chặn hành vi mặc định của thẻ <a> (không load lại trang)
    evt.preventDefault();

    // 2. Ẩn tất cả các nội dung tab đi
    var i, tabcontent, navlinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // 3. Xóa class "active" ở tất cả các nút trong menu
    navlinks = document.getElementsByClassName("nav-link");
    for (i = 0; i < navlinks.length; i++) {
        navlinks[i].className = navlinks[i].className.replace(" active", "");
    }

    // 4. Hiện tab hiện tại và thêm class "active" vào nút vừa bấm
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

function mockSearch() {
    var keyword = document.getElementById('searchInput').value;
    if (keyword.length > 0) {
        document.getElementById('searchPlaceholder').style.display = 'none';
        document.getElementById('searchResultArea').style.display = 'block';
    } else {
        alert("Vui lòng nhập từ vựng!");
    }
}

/* --- LOGIC SỔ TAY TỪ VỰNG (LOCAL STORAGE) --- */

// 1. Khởi tạo: Khi trang web tải xong thì hiện danh sách từ
document.addEventListener('DOMContentLoaded', () => {
    renderVocabList('ALL');
});

function clearError() {
    const inputWord = document.getElementById('inpWord');
    inputWord.style.borderColor = '#ddd'; // Trả về màu viền gốc
}


function detectRelation(newWord, newReading, list) {
    // 1. Kiểm tra trùng khớp hoàn toàn (Root Word Filter)
    const exactMatch = list.find(item => item.word === newWord);
    if (exactMatch) {
        return { type: 'EXACT', match: exactMatch };
    }

    // 2. Kiểm tra trùng Âm đọc (Synonym/Homophone Grouping)
    // Loại bỏ khoảng trắng và chuyển về chữ thường
    const cleanReading = newReading.trim().toLowerCase();
    const readingMatch = list.find(item => item.reading.trim().toLowerCase() === cleanReading);
    
    // Chỉ báo trùng âm nếu từ vựng (Kanji) khác nhau
    if (readingMatch && readingMatch.word !== newWord) {
        return { type: 'HOMOPHONE', match: readingMatch };
    }

    // 3. Kiểm tra trùng Gốc Kanji (Word Family Filter)
    // Sử dụng Regex để lấy ra các ký tự Kanji trong chuỗi (Khoảng Unicode 4E00-9FAF)
    const kanjiRegex = /[\u4e00-\u9faf]/g;
    const newKanjiList = newWord.match(kanjiRegex); // Trả về mảng các chữ Kanji: ["暑"]

    if (newKanjiList && newKanjiList.length > 0) {
        // Tìm trong danh sách xem có từ nào chứa cùng Kanji đó không
        const familyMatch = list.find(item => {
            const oldKanjiList = item.word.match(kanjiRegex);
            if (!oldKanjiList) return false;
            // Kiểm tra xem có giao thoa Kanji nào không (Ví dụ: '暑' trong '暑い' và '暑さ')
            return newKanjiList.some(k => oldKanjiList.includes(k));
        });

        if (familyMatch) {
            return { type: 'FAMILY', match: familyMatch };
        }
    }

    return null; // Không tìm thấy trùng lặp
}

// 2. Hàm Thêm từ mới
function addVocab(event) {
    event.preventDefault(); 

    const inputWordEl = document.getElementById('inpWord');
    const wordVal = inputWordEl.value.trim(); 
    const readingVal = document.getElementById('inpReading').value.trim();
    const meaningVal = document.getElementById('inpMeaning').value.trim();
    const levelVal = document.getElementById('inpLevel').value;

    if (!wordVal || !readingVal) {
        alert("Vui lòng nhập Từ vựng và Cách đọc!");
        return;
    }

    // Lấy danh sách hiện tại
    const currentList = JSON.parse(localStorage.getItem('myVocabList')) || [];

    // --- BẮT ĐẦU PHÂN TÍCH ---
    const relation = detectRelation(wordVal, readingVal, currentList);

    if (relation) {
        // TRƯỜNG HỢP 1: TRÙNG HOÀN TOÀN
        if (relation.type === 'EXACT') {
            alert(`⛔ LỖI: Từ "${wordVal}" đã có trong danh sách!`);
            inputWordEl.style.borderColor = '#e74c3c';
            inputWordEl.focus();
            return;
        }

        // TRƯỜNG HỢP 2: TRÙNG ÂM ĐỌC (Kiku vs Kiku)
        if (relation.type === 'HOMOPHONE') {
            const confirmAdd = confirm(
                `⚠️ CẢNH BÁO ĐỒNG ÂM!\n\n` +
                `Bạn đang thêm "${wordVal}" (${readingVal}).\n` +
                `Hệ thống thấy đã có từ "${relation.match.word}" cũng đọc là "${relation.match.reading}".\n\n` +
                `Mục tiêu số 3: Hãy gom nhóm chúng lại!\n` +
                `👉 Bạn có muốn HỦY thêm mới để vào sửa từ cũ không?`
            );
            if (confirmAdd) return; // Người dùng chọn OK (tức là muốn hủy để gộp), thì dừng lại.
        }

        // TRƯỜNG HỢP 3: CÙNG GỐC KANJI (Atsui vs Atsusa)
        if (relation.type === 'FAMILY') {
            const confirmAdd = confirm(
                `⚠️ CẢNH BÁO GIA ĐÌNH TỪ!\n\n` +
                `Bạn đang thêm "${wordVal}".\n` +
                `Hệ thống thấy đã có từ gốc "${relation.match.word}" (cùng Kanji).\n\n` +
                `Mục tiêu số 2: Nên học từ gia đình trong cùng một thẻ.\n` +
                `👉 Bạn có muốn HỦY thêm mới để thêm từ này vào phần ghi chú của "${relation.match.word}" không?`
            );
            if (confirmAdd) return; // Người dùng chọn OK (Hủy thêm mới)
        }
    }

    // Nếu không trùng hoặc người dùng cố tình muốn thêm (bấm Cancel ở hộp thoại confirm)
    const newVocab = {
        id: Date.now(),
        word: wordVal,
        reading: readingVal,
        meaning: meaningVal,
        level: levelVal
    };

    currentList.unshift(newVocab);
    localStorage.setItem('myVocabList', JSON.stringify(currentList));

    document.getElementById('vocabForm').reset();
    inputWordEl.style.borderColor = '#ddd'; 
    renderVocabList('ALL'); 
    resetFilterButtons();
}

// 3. Hàm Vẽ danh sách ra màn hình (Render)
function renderVocabList(filterLevel) {
    const listContainer = document.getElementById('vocabList');
    listContainer.innerHTML = ''; 

    const vocabData = JSON.parse(localStorage.getItem('myVocabList')) || [];

    const filteredData = (filterLevel === 'ALL') 
        ? vocabData 
        : vocabData.filter(item => item.level === filterLevel);

    if (filteredData.length === 0) {
        listContainer.innerHTML = '<p style="color:#999; grid-column: 1/-1; text-align:center; padding: 20px;">(Chưa có từ vựng nào)</p>';
        return;
    }

    filteredData.forEach(item => {
        const cardHTML = `
            <div class="user-card ${item.level}">
                <span class="uc-level">${item.level}</span>
                <div class="uc-word">${item.word}</div>
                <div class="uc-reading">${item.reading}</div>
                <div class="uc-meaning">${item.meaning}</div>
                <button class="btn-delete" onclick="deleteVocab(${item.id})">Xóa</button>
            </div>
        `;
        listContainer.innerHTML += cardHTML;
    });
}

// 4. Hàm Lọc Level (Xử lý giao diện nút bấm)
function filterLevel(level) {
    const buttons = document.querySelectorAll('.lvl-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.includes(level === 'ALL' ? 'Tất cả' : level)) {
            btn.classList.add('active');
        }
    });
    renderVocabList(level);
}

// Helper: Reset nút lọc về mặc định
function resetFilterButtons() {
    const buttons = document.querySelectorAll('.lvl-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    buttons[0].classList.add('active');
}

/* --- TÍNH NĂNG 1: ĐỌC TIẾNG NHẬT (TEXT-TO-SPEECH) --- */
function speakWord() {
    // 1. Tìm phần tử chứa từ vựng (ID mới là mainWord)
    const wordContainer = document.getElementById('mainWord');
    
    if (!wordContainer) {
        console.error("Không tìm thấy từ vựng để đọc (Kiểm tra lại ID mainWord)");
        return;
    }

    // 2. Tạo bản sao để xử lý (tránh làm hỏng giao diện chính)
    const clone = wordContainer.cloneNode(true);

    // 3. XÓA CÁC THẺ <rt> (Furigana/Chữ nhỏ trên đầu)
    // Nếu không xóa, máy sẽ đọc cả Kanji lẫn Hiragana. Vd: 食たべる -> "Shoku Ta Beru" (Sai)
    // Xóa đi thì chỉ còn: 食べる -> "Taberu" (Đúng)
    const rts = clone.querySelectorAll('rt');
    rts.forEach(rt => rt.remove());
    
    // 4. Lấy nội dung chữ thuần túy
    const textToRead = clone.innerText.trim();

    // 5. Kiểm tra nếu trình duyệt hỗ trợ
    if ('speechSynthesis' in window) {
        // Hủy các câu đang đọc dở (nếu có) để đọc ngay câu mới
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'ja-JP'; // Giọng Nhật
        utterance.rate = 0.9;     // Tốc độ vừa phải
        utterance.pitch = 1;      // Cao độ tự nhiên
        
        // [Tùy chọn] Chọn giọng Google nếu có (nghe hay hơn giọng mặc định)
        const voices = window.speechSynthesis.getVoices();
        const japanVoice = voices.find(voice => voice.lang === 'ja-JP' && voice.name.includes('Google'));
        if (japanVoice) {
            utterance.voice = japanVoice;
        }

        window.speechSynthesis.speak(utterance);
    } else {
        alert("Trình duyệt của bạn không hỗ trợ đọc âm thanh.");
    }
}

// 5. Hàm Xóa từ
function deleteVocab(id) {
    if(confirm('Bạn có chắc muốn xóa từ này không?')) {
        let currentList = JSON.parse(localStorage.getItem('myVocabList')) || [];
        currentList = currentList.filter(item => item.id !== id);
        localStorage.setItem('myVocabList', JSON.stringify(currentList));
        renderVocabList('ALL'); 
        resetFilterButtons();
    }
}


/* --- LOGIC NHẬP HÀNG LOẠT (BULK IMPORT) --- */

function processBulkImport() {
    const rawText = document.getElementById('bulkInput').value.trim();
    if (!rawText) {
        alert("Bạn chưa dán nội dung gì cả!");
        return;
    }

    // 1. Tách dòng
    const lines = rawText.split('\n');
    
    // Lấy danh sách cũ
    let currentList = JSON.parse(localStorage.getItem('myVocabList')) || [];
    
    let countSuccess = 0;
    let countDuplicate = 0;
    let countError = 0;

    // 2. Duyệt từng dòng
    lines.forEach(line => {
        line = line.trim();
        if (!line) return; // Bỏ qua dòng trống

        // Tách các thành phần: Chấp nhận dấu gạch ngang (-), dấu phẩy (,) hoặc dấu Tab
        // Regex này tách theo dấu (-, ,, |) 
        let parts = line.split(/[-|,]/); 

        // Nếu người dùng copy từ Excel, thường là Tab (\t)
        if (parts.length < 2 && line.includes('\t')) {
            parts = line.split('\t');
        }

        // Kiểm tra dữ liệu đủ chưa (Tối thiểu phải có Từ và Nghĩa)
        if (parts.length >= 2) {
            const word = parts[0].trim();
            const reading = parts[1] ? parts[1].trim() : ""; // Có thể để trống cách đọc
            // Nếu chỉ có 2 phần thì phần 2 là nghĩa, nếu 3 phần thì phần 3 là nghĩa...
            const meaning = parts[2] ? parts[2].trim() : parts[1].trim(); 
            // Level: Mặc định N5 nếu không ghi
            let level = parts[3] ? parts[3].trim().toUpperCase() : "N5";
            
            // Chuẩn hóa Level (Chỉ chấp nhận N1-N5)
            if (!['N1','N2','N3','N4','N5'].includes(level)) level = "N5";

            // --- KIỂM TRA TRÙNG LẶP (Logic đơn giản hóa cho Import) ---
            const isExist = currentList.some(item => item.word.toLowerCase() === word.toLowerCase());

            if (!isExist) {
                // Thêm mới
                currentList.unshift({
                    id: Date.now() + Math.random(), // Thêm random để tránh trùng ID khi chạy vòng lặp quá nhanh
                    word, reading, meaning, level
                });
                countSuccess++;
            } else {
                countDuplicate++;
            }
        } else {
            countError++;
        }
    });

    // 3. Lưu lại và Thông báo kết quả
    localStorage.setItem('myVocabList', JSON.stringify(currentList));
    
    // Vẽ lại danh sách
    renderVocabList('ALL');
    resetFilterButtons();

    // Reset ô nhập
    document.getElementById('bulkInput').value = '';

    // Báo cáo
    alert(
        `📊 BÁO CÁO NHẬP LIỆU:\n\n` +
        `✅ Thành công: ${countSuccess} từ\n` +
        `⚠️ Bỏ qua (Trùng lặp): ${countDuplicate} từ\n` +
        `❌ Lỗi định dạng: ${countError} dòng`
    );
}

function clearBulk() {
    document.getElementById('bulkInput').value = '';
}

function toggleEditMode() {
    // Thêm class vào body để CSS biết đang sửa
    document.body.classList.add('is-editing');

    // Tìm tất cả các thẻ có class 'editable' và cho phép sửa
    const editableElements = document.querySelectorAll('.editable');
    editableElements.forEach(el => {
        el.contentEditable = "true";
    });

    // Đổi nút Sửa -> Lưu
    document.getElementById('btnEdit').style.display = 'none';
    document.getElementById('btnSave').style.display = 'inline-block';
}

// 1. BẬT CHẾ ĐỘ SỬA (ĐÃ KHÓA THẺ SMALL TRONG BẢNG CHIA)
function enableGlobalEdit() {
    const container = document.querySelector('.bento-container');
    
    // A. Backup dữ liệu gốc
    originalContent = container.innerHTML;

    // B. XỬ LÝ BIẾN HÌNH TAG LEVEL (Giữ nguyên logic cũ)
    const jlptTag = container.querySelector('.tag-jlpt');
    if (jlptTag) {
        // ... (Giữ nguyên phần code tạo Select box màu xanh ở câu trước) ...
        const currentLevel = jlptTag.innerText.trim();
        const select = document.createElement('select');
        select.className = 'tag-jlpt-select';
        
        select.style.cssText = `
            background-color: #192a56 !important; 
            color: #ffffff !important; 
            border: 1px solid #131f40 !important;
            border-radius: 4px !important;
            padding: 2px 30px 2px 8px !important;
            font-size: 14px !important;
            font-weight: bold !important;
            font-family: sans-serif !important;
            cursor: pointer !important;
            display: inline-block !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e") !important;
            background-repeat: no-repeat !important;
            background-position: right 5px center !important;
            background-size: 16px !important;
        `;

        const levels = ['N5', 'N4', 'N3', 'N2', 'N1'];
        levels.forEach(lvl => {
            const option = document.createElement('option');
            option.value = lvl;
            option.text = lvl;
            option.style.backgroundColor = "#ffffff";
            option.style.color = "#333333";
            if (lvl === currentLevel) option.selected = true;
            select.appendChild(option);
        });
        jlptTag.replaceWith(select);
    }

    // C. Bật sửa cho toàn bộ khung
    container.contentEditable = "true";
    
    // D. --- KHÓA CÁC THÀNH PHẦN KHÔNG ĐƯỢC SỬA ---
    const protectedSelectors = [
        '#mainWord', '.b-title', '.jukugo-header', 
        '.g-lbl', '.sa-label', '.k-name', '.y-lbl', '.card-toolbar',
        '.tag-pos', '.tag-jlpt-select',
        
        // --- CẬP NHẬT MỚI Ở ĐÂY ---
        'small',   // <--- Khóa thẻ small (Tiêu đề trong bảng chia động từ)
        'summary', // <--- Khóa dòng "⚡ Bảng chia 12 thể động từ"
        'strong',  // <--- Khóa các chữ in đậm dùng làm tiêu đề (nếu có)
        'th'       // <--- Khóa tiêu đề bảng (nếu dùng table)
    ];
    
    // Tìm và khóa
const protectedElements = container.querySelectorAll(protectedSelectors.join(','));
    protectedElements.forEach(el => {
        el.contentEditable = "false";
        el.style.userSelect = "none"; // Ngăn không cho bôi đen chuột vào vùng bị khóa
    });

    // E. Đổi nút
    document.getElementById('btnEdit').style.display = 'none';
    document.getElementById('btnCancel').style.display = 'inline-flex';
    
    container.focus();
}
function saveGlobalContent() {
    const container = document.querySelector('.bento-container');
    
    // A. XỬ LÝ BIẾN HÌNH NGƯỢC LẠI: SELECT -> SPAN
    // Tìm cái select box chúng ta đã tạo lúc nãy
    const select = container.querySelector('.tag-jlpt-select');
    if (select) {
        const selectedValue = select.value; // Lấy giá trị người dùng chọn (Vd: N3)
        
        // Tạo lại thẻ Span
        const span = document.createElement('span');
        span.className = 'tag tag-jlpt'; // Gán lại class gốc
        span.innerText = selectedValue;
        
        // Thay thế Select bằng Span
        select.replaceWith(span);
    }

    // B. Tắt sửa và Lưu (Logic cũ)
    container.contentEditable = "false";
    
    let currentWord = document.getElementById('mainWord') 
                      ? document.getElementById('mainWord').innerText 
                      : "default";
    currentWord = currentWord.replace(/\s/g, ''); 
    localStorage.setItem('saved_content_' + currentWord, container.innerHTML);

    document.getElementById('btnCancel').style.display = 'none';
    document.getElementById('btnEdit').style.display = 'inline-flex';

    alert("✅ Đã lưu thay đổi (Cập nhật Level)!");
}

function cancelEdit() {
    // Không cần confirm cho nhanh, hoặc giữ confirm tùy bạn
    if (confirm("Hủy bỏ các chỉnh sửa vừa rồi?")) {
        const container = document.querySelector('.bento-container');
        
        // Hoàn tác nội dung cũ
        container.innerHTML = originalContent;
        
        // Tắt sửa
        container.contentEditable = "false";
        
        // ĐỔI NÚT: Hủy -> Sửa
        document.getElementById('btnCancel').style.display = 'none';
        document.getElementById('btnEdit').style.display = 'inline-flex';
        
        // Reset lại sự kiện click cho các nút bên trong (nếu bị mất do innerHTML)
        // (Với cấu trúc hiện tại thì nút nằm trong toolbar có contenteditable=false nên không bị ảnh hưởng)
    }
}

function saveEditMode() {
    // Tắt chế độ sửa
    document.body.classList.remove('is-editing');

    const editableElements = document.querySelectorAll('.editable');
    editableElements.forEach(el => {
        el.contentEditable = "false";
    });

    // Đổi nút Lưu -> Sửa
    document.getElementById('btnSave').style.display = 'none';
    document.getElementById('btnEdit').style.display = 'inline-block';

    // [NÂNG CAO] Tại đây bạn có thể viết code để lưu nội dung HTML mới 
    // vào LocalStorage nếu muốn giữ lại thay đổi sau khi F5.
    // Hiện tại chỉ thông báo đã lưu giao diện.
    alert("✅ Đã cập nhật nội dung chỉnh sửa!");
}

function resetButtons() {
    document.getElementById('btnEdit').style.display = 'inline-flex';
    document.getElementById('btnSave').style.display = 'none';
    document.getElementById('btnCancel').style.display = 'none';
}

function checkAndLoadSavedData(word) {
    const savedHTML = localStorage.getItem('saved_content_' + word.replace(/\s/g, ''));
    if (savedHTML) {
        document.querySelector('.bento-container').innerHTML = savedHTML;
        // Gán lại sự kiện cho các nút trong HTML vừa load (nếu cần)
    }
}

/* =========================================
   CẤU HÌNH TÌM KIẾM AI (GEMINI)
   ========================================= */

// ⚠️ THAY API KEY CỦA BẠN VÀO DÒNG DƯỚI ĐÂY
const GEMINI_API_KEY = "AIzaSyAbTfgNLqvMlp3y2d5cparWxacccHZjTlg"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Biến theo dõi nguồn gốc (Để nút Lưu biết là từ AI)
// let currentSource = 'manual'; (Biến này đã khai báo ở trên đầu file rồi thì bỏ qua dòng này)

// 1. XỬ LÝ ẤN PHÍM ENTER
function handleEnter(e) {
    if (e.key === 'Enter') handleAISearch();
}

// 2. HÀM TÌM KIẾM CHÍNH
async function handleAISearch() {
    const input = document.getElementById('searchInput');
    const keyword = input.value.trim();

    if (!keyword) {
        alert("Vui lòng nhập từ vựng cần tra!");
        input.focus();
        return;
    }

    // A. BẬT TRẠNG THÁI LOADING
    const spinner = document.getElementById('loadingSpinner');
    const container = document.querySelector('.bento-container');
    
    spinner.style.display = 'block';
    if(container) container.style.opacity = '0.3'; // Làm mờ nội dung cũ

    // B. ĐÁNH DẤU NGUỒN LÀ AI (Quan trọng cho nút Lưu)
    currentSource = 'ai'; 

    try {
        console.log(`🚀 Đang gửi yêu cầu tra từ: "${keyword}" tới Gemini...`);
        
        // C. GỌI API
        const data = await fetchGeminiData(keyword);
        
        // D. VẼ GIAO DIỆN (RENDER)
        renderBentoGrid(data);
        
        console.log("✅ Đã tải xong dữ liệu!");

    } catch (error) {
        console.error("Lỗi AI:", error);
        alert("⚠️ AI đang bận hoặc lỗi mạng: " + error.message);
    } finally {
        // E. TẮT LOADING
        spinner.style.display = 'none';
        if(container) container.style.opacity = '1';
    }
}

/* --- HÀM GỌI API (PHIÊN BẢN CHI TIẾT CAO CẤP) --- */
async function fetchGeminiData(word) {
    const prompt = `
        Analyze word: "${word}" for a Japanese Dictionary App.
        Target audience: Vietnamese learners.
        Output: JSON only. No Markdown.
        
        MANDATORY JSON STRUCTURE:
        {
            "k": "Kanji (Main word)",
            "h": "Furigana (Reading)",
            "rom": "Romaji",
            "pos": "Part of speech (Vd: Động từ nhóm 2)",
            "lvl": "JLPT Level (Vd: N5)",
            "m": "Meaning (Short title)",
            "md": "Meaning Detail (Full sentence)",
            
            "kanji_info": { // Phân tích chữ Hán chính
                "char": "Chữ Hán đơn",
                "hv": "Hán Việt (Vd: THỰC)",
                "kun": "Kunyomi (Vd: ta(beru))",
                "on": "Onyomi (Vd: SHOKU)",
                "mem": "Mnemonic/Câu chuyện ghi nhớ (Tiếng Việt)"
            },
            
            "grammar": {
                "part": "Trợ từ đi kèm (Vd: を, に)",
                "part_desc": "Giải thích trợ từ (Vd: làm gì đó)",
                "trans": "Tha động từ (nếu có, nếu không để null)",
                "intrans": "Tự động từ (nếu có, nếu không để null)",
                "fam": "Từ biến thể/gia đình (Vd: 食べ物)"
            },
            
            "jukugo": [ // 4 từ ghép
                {"w": "Từ ghép", "m": "Nghĩa"}
            ],
            
            "nuance": {
                "style": "Văn phong (Vd: Hội thoại / Trang trọng)",
                "hon": "Tôn kính ngữ (Vd: 召し上がる) - Nếu không có để null",
                "hum": "Khiêm nhường ngữ (Vd: いただく) - Nếu không có để null",
                "err": "Lỗi sai thường gặp/Lưu ý (Tiếng Việt)"
            },
            
            "ex": [ // 3-4 ví dụ
                {"j": "Câu Nhật", "v": "Nghĩa Việt"}
            ],
            
            "col": ["Cụm từ 1", "Cụm từ 2", "Cụm từ 3"],
            "syn": ["Đồng nghĩa 1", "Đồng nghĩa 2"],
            "ant": ["Trái nghĩa 1", "Trái nghĩa 2"],
            
            "forms": { // Bảng chia 12 thể (Nếu là Danh từ/Tính từ thì để null hoặc chuỗi rỗng)
                "dic": "Từ điển (Ru)",
                "masu": "Lịch sự (Masu)",
                "nai": "Phủ định (Nai)",
                "ta": "Quá khứ (Ta)",
                "te": "Tiếp diễn (Te)",
                "you": "Ý chí (You)",
                "pot": "Khả năng",
                "pas": "Bị động",
                "cau": "Sai khiến",
                "imp": "Mệnh lệnh",
                "pro": "Cấm chỉ",
                "cau_pas": "Bị động sai khiến"
            }
        }
    `;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const result = await response.json();
    let textData = result.candidates[0].content.parts[0].text;
    textData = textData.replace(/```json|```/g, '').trim();
    return JSON.parse(textData);
}

// 4. HÀM VẼ GIAO DIỆN BENTO GRID (Đổ dữ liệu vào HTML)
/* --- HÀM RENDER DỮ LIỆU VÀO BENTO GRID 16 MỤC --- */
function renderBentoGrid(data) {
    const container = document.querySelector('.bento-container');

    // 1. XỬ LÝ CÁC PHẦN TỬ CON TRƯỚC (Để code HTML chính đỡ rối)
    
    // Jukugo List
    const jukugoHTML = data.jukugo.map(j => 
        `<span class="tag-jukugo" title="${j.m}">${j.w}</span>`
    ).join('');

    // Examples List
    const exampleHTML = data.ex.map(ex => `
        <li>
            <p class="jp">${ex.j}</p>
            <p class="vn">${ex.v}</p>
        </li>
    `).join('');

    // Collocations
    const colHTML = data.col.map(c => `<li>${c}</li>`).join('');
    // Synonyms / Antonyms
    const synHTML = data.syn.length ? data.syn.map(s => `<li>${s}</li>`).join('') : '<li>---</li>';
    const antHTML = data.ant.length ? data.ant.map(a => `<li>${a}</li>`).join('') : '<li>---</li>';

    // Xử lý hiển thị Tự/Tha động từ
    let transPairHTML = '';
    if (data.grammar.trans && data.grammar.intrans) {
        transPairHTML = `
            <span class="active">Tha: ${data.grammar.trans}</span> ↔ <span>Tự: ${data.grammar.intrans}</span>
        `;
    } else {
        transPairHTML = `<span>${data.k} (Không có cặp Tự/Tha rõ ràng)</span>`;
    }

    // Xử lý bảng chia động từ (Nếu API trả về null do là danh từ, ta điền dấu gạch ngang)
    const f = data.forms || {};
    const getF = (val) => val ? val : '---';


    // 2. RENDER HTML CHÍNH (COPY NGUYÊN BẢN CẤU TRÚC CỦA BẠN)
    container.innerHTML = `
        <div class="bento-item area-header">
            <div class="word-primary">
                <div class="w-jp">
                    <span id="mainWord">
                        <ruby>${data.k}<rt>${data.h}</rt></ruby>
                    </span>
                    <button class="btn-audio-mini" onclick="speakWord('${data.h}')">🔊</button>
                </div>
                <div class="w-tags">
                    <span class="tag tag-pos editable">${data.pos}</span>
                    <span class="tag tag-jlpt editable">${data.lvl || 'N/A'}</span>
                </div>
            </div>
            
            <div class="word-meaning">
                <h2 class="editable">${data.m}</h2>
                <p class="editable">${data.md}</p>
            </div>
            <div class="card-toolbar" contenteditable="false">
                <button id="btnEdit" onclick="enableGlobalEdit()" class="tool-btn edit">✏️ Sửa</button>
                <button id="btnCancel" onclick="cancelEdit()" class="tool-btn cancel" style="display: none;">✖ Hủy</button>
                <button id="btnSave" onclick="saveGlobalContent()" class="tool-btn save">💾 Lưu</button>
            </div>
        </div>

        <div class="bento-item area-kanji">
            <h4 class="b-title">🧩 Phân tích Hán Tự</h4>
            <div class="kanji-box">
                <div class="k-char">${data.kanji_info.char || data.k[0]}</div>
                <div class="k-info">
                    <div class="k-name">${data.kanji_info.hv}</div>
                    <ul class="k-yomi">
                        <li><span class="y-lbl kun">訓</span> ${data.kanji_info.kun}</li>
                        <li><span class="y-lbl on">音</span> ${data.kanji_info.on}</li>
                    </ul>
                </div>
            </div>
            <div class="mnemonic-box">
                <strong>💡 Ghi nhớ:</strong> ${data.kanji_info.mem}
            </div>
        </div>

        <div class="bento-item area-grammar">
            <h4 class="b-title">⚙️ Cấu trúc & Từ gia đình</h4>
            <div class="grammar-grid">
                <div class="g-row">
                    <span class="g-lbl">Trợ từ:</span>
                    <span class="g-val"><strong>${data.grammar.part || '---'}</strong> (${data.grammar.part_desc || ''})</span>
                </div>
                <div class="g-row">
                    <span class="g-lbl">Tự/Tha:</span>
                    <div class="trans-pair">${transPairHTML}</div>
                </div>
                
                <div class="jukugo-section">
                    <div class="jukugo-header">🈴 Từ ghép Hán tự (Jukugo)</div>
                    <div class="jukugo-list">${jukugoHTML}</div>
                </div>

                <div class="g-row no-border">
                    <span class="g-lbl">Biến thể:</span>
                    <span class="g-val">${data.grammar.fam || 'Không có'}</span>
                </div>
            </div>
        </div>

        <div class="bento-item area-nuance">
            <h4 class="b-title">🎭 Sắc thái & Kính ngữ</h4>
            <div class="nuance-content">
                <p><strong>Văn phong:</strong> <span class="badge-soft">${data.nuance.style}</span></p>
                <div class="keigo-table">
                    <div class="k-row">
                        <span>⬆️ Tôn kính:</span> 
                        <strong>${data.nuance.hon || '---'}</strong>
                    </div>
                    <div class="k-row">
                        <span>⬇️ Khiêm nhường:</span> 
                        <strong>${data.nuance.hum || '---'}</strong>
                    </div>
                </div>
                <div class="mistake-alert">
                    ⚠️ <strong>Lưu ý:</strong> ${data.nuance.err || 'Chưa có lưu ý đặc biệt.'}
                </div>
            </div>
        </div>

        <div class="bento-item area-examples">
            <h4 class="b-title">📖 Ví dụ thực tế</h4>
            <ul class="example-list">${exampleHTML}</ul>
        </div>

        <div class="bento-item area-colloc">
            <h4 class="b-title">🔗 Kết hợp từ</h4>
            <ul class="colloc-list">${colHTML}</ul>
            
            <div class="synonym-antonym-box">
                <div class="sa-row">
                    <span class="sa-label syn">🔄 Đồng nghĩa:</span>
                    <ul class="sa-list">${synHTML}</ul>
                </div>
                <div class="sa-row">
                    <span class="sa-label ant">↔️ Trái nghĩa:</span>
                    <ul class="sa-list">${antHTML}</ul>
                </div>
            </div>
        </div>

        <div class="bento-item area-conjugation">
            <details open> <summary>⚡ Bảng chia 12 thể động từ</summary>
                <div class="conju-grid-full">
                    <div class="cj-cell"><small>Từ điển (る)</small><b>${getF(f.dic)}</b></div>
                    <div class="cj-cell"><small>Lịch sự (ます)</small><b>${getF(f.masu)}</b></div>
                    <div class="cj-cell"><small>Phủ định (ない)</small><b>${getF(f.nai)}</b></div>
                    <div class="cj-cell"><small>Quá khứ (た)</small><b>${getF(f.ta)}</b></div>
                    <div class="cj-cell"><small>Tiếp diễn (て)</small><b>${getF(f.te)}</b></div>
                    <div class="cj-cell"><small>Ý chí (よう)</small><b>${getF(f.you)}</b></div>
                    <div class="cj-cell"><small>Khả năng</small><b>${getF(f.pot)}</b></div>
                    <div class="cj-cell"><small>Bị động</small><b>${getF(f.pas)}</b></div>
                    <div class="cj-cell"><small>Sai khiến</small><b>${getF(f.cau)}</b></div>
                    <div class="cj-cell"><small>Mệnh lệnh</small><b>${getF(f.imp)}</b></div>
                    <div class="cj-cell"><small>Cấm chỉ</small><b>${getF(f.pro)}</b></div>
                    <div class="cj-cell"><small>BĐ sai khiến</small><b>${getF(f.cau_pas)}</b></div>
                </div>
            </details>
        </div>
    `;

    // Hiển thị vùng kết quả nếu đang ẩn
    const searchArea = document.getElementById('searchResultArea');
    if(searchArea) searchArea.style.display = 'block';
}