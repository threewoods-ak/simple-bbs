const API_URL = '/api/comments';

document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    const charCount = document.getElementById('charCount');
    const postButton = document.getElementById('postButton');
    const statusMessage = document.getElementById('statusMessage');
    const commentsList = document.getElementById('commentsList');

    // Character count - removed as per design
    /*
    messageInput.addEventListener('input', () => {
        const length = messageInput.value.length;
        charCount.textContent = `${length}/100`;
        if (length > 100) {
            charCount.style.color = 'var(--error-color)';
            postButton.disabled = true;
        } else {
            charCount.style.color = 'var(--text-secondary)';
            postButton.disabled = length === 0;
        }
    });
    */

    // Post comment
    postButton.addEventListener('click', async () => {
        const message = messageInput.value.trim();
        if (!message) return;

        postButton.disabled = true;
        postButton.textContent = '投稿中...';
        statusMessage.textContent = '';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (response.ok) {
                messageInput.value = '';
                // charCount.textContent = '0/100';
                statusMessage.textContent = '投稿しました！';
                statusMessage.className = 'success';
                loadComments(); // Reload comments
            } else {
                statusMessage.textContent = data.error || '投稿に失敗しました。';
                statusMessage.className = 'error';
            }
        } catch (error) {
            statusMessage.textContent = 'ネットワークエラーが発生しました。';
            statusMessage.className = 'error';
        } finally {
            postButton.disabled = false;
            postButton.textContent = '投稿する';
        }
    });

    // Load comments
    async function loadComments() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to load');
            const comments = await response.json();
            renderComments(comments);
        } catch (error) {
            commentsList.innerHTML = '<div class="error">コメントの読み込みに失敗しました。</div>';
        }
    }

    function renderComments(comments) {
        commentsList.innerHTML = '';
        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="loading">まだコメントはありません。一番乗りで投稿しましょう！</div>';
            return;
        }

        comments.forEach(comment => {
            const item = document.createElement('div');
            item.className = 'comment-item';

            const d = new Date(comment.created_at);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            
            let messageContent = escapeHtml(comment.message);
            let isHidden = false;

            if (messageContent.startsWith('__HIDDEN__:')) {
                const hiddenContent = messageContent.substring(11);
                messageContent = `<span class="hidden-content" data-content="${hiddenContent}">***** (クリックして表示)</span>`;
                isHidden = true;
            }

            item.innerHTML = `
                <span class="comment-text">${messageContent}</span>
                <span class="comment-date">- (${dateStr})</span>
            `;

            if (isHidden) {
                const hiddenSpan = item.querySelector('.hidden-content');
                hiddenSpan.style.cursor = 'pointer';
                hiddenSpan.style.color = 'var(--text-secondary)';
                hiddenSpan.addEventListener('click', function() {
                    this.textContent = this.dataset.content;
                    this.style.color = 'inherit';
                    this.style.cursor = 'default';
                });
            }

            commentsList.appendChild(item);
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initial load
    loadComments();
});
