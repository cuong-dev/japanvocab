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