/**
 * Vercel Edge middleware: ACCESS_PASSWORD gate.
 * Accepts only HMAC sessions from api/access-session.js (never raw password cookies).
 */

import {
  ACCESS_COOKIE_NAME,
  readCookie,
  verifyAccessSessionToken,
} from './api/access-session.js';

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes
     * - static files with extensions
     * - known static asset prefixes
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets/|.*\\.).*)',
  ],
};

export default async function middleware(request) {
  const accessPassword = process.env.ACCESS_PASSWORD;

  if (!accessPassword) {
    return;
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const sessionToken = readCookie(cookieHeader, ACCESS_COOKIE_NAME);
  const authenticated = await verifyAccessSessionToken(sessionToken, accessPassword);

  if (authenticated) {
    return;
  }

  const acceptLanguage = request.headers.get('accept-language') || '';
  const preferChinese = acceptLanguage.includes('zh');

  return new Response(generateAuthPage(preferChinese), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

function generateAuthPage(isChinese = true) {
  const text = {
    title: isChinese ? '访问验证 - Prompt Optimizer' : 'Access Verification - Prompt Optimizer',
    heading: 'Prompt Optimizer',
    subtitle: isChinese ? '此站点受密码保护' : 'This site is password protected',
    passwordLabel: isChinese ? '访问密码' : 'Access Password',
    passwordPlaceholder: isChinese ? '请输入访问密码' : 'Enter access password',
    submitButton: isChinese ? '验证并访问' : 'Verify & Access',
    loading: isChinese ? '验证中，请稍候...' : 'Verifying, please wait...',
    footer: isChinese ? '安全访问控制 | Powered by Vercel' : 'Secure Access Control | Powered by Vercel',
    errorNetwork: isChinese ? '网络错误，请重试' : 'Network error, please try again',
  };

  return `
<!DOCTYPE html>
<html lang="${isChinese ? 'zh-CN' : 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${text.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .auth-modal {
            background: white;
            padding: 2.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
            text-align: center;
        }
        .logo { font-size: 2rem; margin-bottom: 1rem; color: #667eea; }
        h1 { font-size: 1.5rem; color: #333; margin-bottom: 0.5rem; }
        .subtitle { color: #666; margin-bottom: 2rem; font-size: 0.9rem; }
        .form-group { margin-bottom: 1.5rem; text-align: left; }
        label { display: block; margin-bottom: 0.5rem; color: #333; font-weight: 500; }
        input[type="password"] {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e1e5e9;
            border-radius: 6px;
            font-size: 1rem;
        }
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .submit-btn {
            width: 100%;
            padding: 0.75rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
        }
        .submit-btn:disabled { background: #ccc; cursor: not-allowed; }
        .error-message {
            color: #e74c3c;
            margin-top: 1rem;
            font-size: 0.9rem;
            display: none;
            padding: 0.5rem;
            background: #ffeaea;
            border-radius: 4px;
            border-left: 4px solid #e74c3c;
        }
        .loading { display: none; margin-top: 1rem; color: #667eea; }
        .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #eee;
            font-size: 0.8rem;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="auth-modal">
        <div class="logo">🚀</div>
        <h1>${text.heading}</h1>
        <p class="subtitle">${text.subtitle}</p>
        <form id="authForm">
            <div class="form-group">
                <label for="password">${text.passwordLabel}</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    placeholder="${text.passwordPlaceholder}"
                    autocomplete="current-password"
                >
            </div>
            <button type="submit" class="submit-btn" id="submitBtn">
                <span id="btnText">${text.submitButton}</span>
            </button>
            <div class="error-message" id="errorMessage"></div>
            <div class="loading" id="loading">${text.loading}</div>
        </form>
        <div class="footer">${text.footer}</div>
    </div>
    <script>
        const form = document.getElementById('authForm');
        const submitBtn = document.getElementById('submitBtn');
        const btnText = document.getElementById('btnText');
        const errorMessage = document.getElementById('errorMessage');
        const loading = document.getElementById('loading');
        const passwordInput = document.getElementById('password');
        const isChinese = document.documentElement.lang === 'zh-CN';
        const errorMessages = {
            network: '${text.errorNetwork}',
            invalidPassword: isChinese ? '密码错误，请重试' : 'Invalid password, please try again',
            rateLimited: isChinese ? '尝试次数过多，请稍后再试' : 'Too many attempts, please try later'
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = passwordInput.value.trim();
            if (!password) return;

            submitBtn.disabled = true;
            btnText.style.display = 'none';
            loading.style.display = 'block';
            errorMessage.style.display = 'none';

            try {
                const response = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ action: 'verify', password })
                });
                const data = await response.json().catch(() => ({}));
                if (response.status === 429) {
                    errorMessage.textContent = data.message || errorMessages.rateLimited;
                    errorMessage.style.display = 'block';
                } else if (data.success) {
                    window.location.reload();
                } else {
                    errorMessage.textContent = data.message || errorMessages.invalidPassword;
                    errorMessage.style.display = 'block';
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            } catch (error) {
                errorMessage.textContent = errorMessages.network;
                errorMessage.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                loading.style.display = 'none';
            }
        });

        passwordInput.focus();
        passwordInput.addEventListener('input', () => {
            errorMessage.style.display = 'none';
        });
    </script>
</body>
</html>`;
}
