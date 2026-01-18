// Configuration
const API_BASE_URL = 'https://simple-bbs.y-miki.workers.dev/api';

// DOM elements
const commentForm = document.getElementById('commentForm');
const messageInput = document.getElementById('messageInput');
const submitBtn = document.getElementById('submitBtn');
const charCount = document.getElementById('charCount');
const messageDiv = document.getElementById('message');
const loadingDiv = document.getElementById('loading');
const commentsList = document.getElementById('commentsList');

// State
let censoredMessages = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadComments();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Character counter
    messageInput.addEventListener('input', () => {
        const count = messageInput.value.length;
        charCount.textContent = `${count}/100`;
        
        if (count >= 100) {
            charCount.style.color = 'var(--error-color)';
        } else {
            charCount.style.color = '#666';
        }
    });

    // Form submission
    commentForm.addEventListener('submit', handleSubmit);
}

// Load comments from API
async function loadComments() {
    try {
        loadingDiv.style.display = 'block';
        commentsList.innerHTML = '';

        const response = await fetch(`${API_BASE_URL}/comments`);
        
        if (!response.ok) {
            throw new Error('Failed to load comments');
        }

        const comments = await response.json();
        
        loadingDiv.style.display = 'none';
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="empty-state">まだコメントがありません。最初のコメントを投稿してみましょう！</div>';
            return;
        }

        renderComments(comments);
    } catch (error) {
        console.error('Error loading comments:', error);
        loadingDiv.style.display = 'none';
        showMessage('コメントの読み込みに失敗しました', 'error');
    }
}

// Render comments
function renderComments(comments) {
    commentsList.innerHTML = comments.map(comment => {
        const date = new Date(comment.created_at);
        const dateStr = formatDate(date);
        const isCensored = comment.message === '*****';

        return `
            <div class="comment">
                <div class="comment-header">
                    <span class="comment-id">ID: ${comment.id.substring(0, 8)}</span>
                    <span class="comment-date">${dateStr}</span>
                </div>
                <div class="comment-message ${isCensored ? 'censored' : ''}" 
                     ${isCensored ? `data-comment-id="${comment.id}"` : ''}>
                    ${escapeHtml(comment.message)}
                </div>
            </div>
        `;
    }).join('');

    // Add click listeners to censored messages
    document.querySelectorAll('.comment-message.censored').forEach(el => {
        el.addEventListener('click', () => {
            const commentId = el.dataset.commentId;
            if (censoredMessages[commentId]) {
                el.textContent = censoredMessages[commentId];
                el.classList.remove('censored');
            }
        });
    });
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();

    const message = messageInput.value.trim();

    if (!message) {
        showMessage('メッセージを入力してください', 'error');
        return;
    }

    if (message.length > 100) {
        showMessage('メッセージは100文字以内で入力してください', 'error');
        return;
    }

    // Disable form
    submitBtn.disabled = true;
    submitBtn.textContent = '投稿中...';

    try {
        const response = await fetch(`${API_BASE_URL}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 429) {
                showMessage('投稿は1分に1回までです。しばらく待ってから再度お試しください。', 'error');
            } else if (result.level === 3) {
                showMessage('このメッセージは不適切な内容または個人情報が含まれているため投稿できません', 'error');
            } else {
                showMessage(result.error || '投稿に失敗しました', 'error');
            }
            return;
        }

        // Store original message for level 2 (censored)
        if (result.level === 2 && result.originalMessage) {
            censoredMessages[result.id] = result.originalMessage;
            showMessage('投稿しました（一部の表現が伏せ字になりました）', 'warning');
        } else {
            showMessage('投稿しました！', 'success');
        }

        // Clear form
        messageInput.value = '';
        charCount.textContent = '0/100';

        // Reload comments
        setTimeout(() => {
            loadComments();
        }, 500);

    } catch (error) {
        console.error('Error posting comment:', error);
        showMessage('投稿に失敗しました', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '投稿';
    }
}

// Show message
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message show ${type}`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 5000);
}

// Format date
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) {
        return 'たった今';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}分前`;
    }
    
    // Less than 1 day
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}時間前`;
    }
    
    // More than 1 day
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// Escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
