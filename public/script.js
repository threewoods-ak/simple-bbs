const API_URL = 'https://simple-bbs-copilot.zhongweixiongtai592.workers.dev/api/comments';

const commentForm = document.getElementById('commentForm');
const messageInput = document.getElementById('messageInput');
const submitBtn = document.getElementById('submitBtn');
const messageArea = document.getElementById('messageArea');
const commentsList = document.getElementById('commentsList');
const charCount = document.getElementById('charCount');

// Character counter
messageInput.addEventListener('input', () => {
  const count = messageInput.value.length;
  charCount.textContent = count;

  if (count > 100) {
    charCount.style.color = '#d32f2f';
  } else {
    charCount.style.color = '#666';
  }
});

// Load comments on page load
loadComments();

// Form submission
commentForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const message = messageInput.value.trim();

  if (!message) {
    showMessage('コメントを入力してください', 'error');
    return;
  }

  if (message.length > 100) {
    showMessage('コメントは100文字以内で入力してください', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '投稿中...';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();

    if (response.ok) {
      showMessage('コメントを投稿しました！', 'success');
      messageInput.value = '';
      charCount.textContent = '0';

      // Reload comments after a short delay
      setTimeout(() => {
        loadComments();
      }, 500);
    } else {
      showMessage(data.error || '投稿に失敗しました', 'error');
    }
  } catch (error) {
    console.error('Error posting comment:', error);
    showMessage('投稿に失敗しました。もう一度お試しください。', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '投稿する';
  }
});

async function loadComments() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error('Failed to load comments');
    }

    const comments = await response.json();

    displayComments(comments);
  } catch (error) {
    console.error('Error loading comments:', error);
    commentsList.innerHTML =
      '<div class="empty-state"><p>コメントの読み込みに失敗しました</p></div>';
  }
}

function displayComments(comments) {
  if (!comments || comments.length === 0) {
    commentsList.innerHTML =
      '<div class="empty-state"><p>まだコメントがありません</p><p>最初のコメントを投稿してみましょう！</p></div>';
    return;
  }

  commentsList.innerHTML = comments
    .map((comment) => {
      const date = new Date(comment.created_at);
      const formattedDate = formatDate(date);

      const isHidden = comment.moderation_level === 2;
      const messageClass = isHidden ? 'hidden-message' : '';
      const dataOriginal = isHidden ? `data-original="${escapeHtml(comment.original_message || '')}"` : '';

      return `
      <div class="comment" data-id="${escapeHtml(comment.id)}">
        <div class="comment-message ${messageClass}" ${dataOriginal}>
          ${escapeHtml(comment.message)}
        </div>
        <div class="comment-meta">
          <span class="comment-date">${formattedDate}</span>
        </div>
      </div>
    `;
    })
    .join('');

  // Add click event listeners for hidden messages
  const hiddenMessages = commentsList.querySelectorAll('.comment-message.hidden-message');
  console.log('Found hidden messages:', hiddenMessages.length);
  hiddenMessages.forEach((element) => {
    console.log('Adding listener to:', element.textContent, 'data-original:', element.getAttribute('data-original'));
    element.addEventListener('click', function() {
      revealMessage(this);
    });
  });
}

function revealMessage(element) {
  console.log('revealMessage called');
  console.log('element.textContent:', element.textContent);
  console.log('data-original:', element.getAttribute('data-original'));
  
  if (element.textContent === '*****') {
    const originalMessage = element.getAttribute('data-original');
    console.log('originalMessage:', originalMessage);
    element.textContent = originalMessage || '不適切な表現が含まれている可能性があります';
    element.classList.remove('hidden-message');
    element.style.cursor = 'default';
  }
}

function showMessage(message, type) {
  messageArea.textContent = message;
  messageArea.className = `message-area ${type}`;
  messageArea.style.display = 'block';

  setTimeout(() => {
    messageArea.style.display = 'none';
  }, 5000);
}

function formatDate(date) {
  const now = new Date();
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}日前`;
  } else if (hours > 0) {
    return `${hours}時間前`;
  } else if (minutes > 0) {
    return `${minutes}分前`;
  } else {
    return 'たった今';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Auto-refresh comments every 30 seconds
setInterval(loadComments, 30000);
