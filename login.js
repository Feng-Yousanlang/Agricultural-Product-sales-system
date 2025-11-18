// 后端API基础地址
const API_BASE = 'http://10.61.194.227:8080';

// 标签切换登录方式
const tabPwd = document.getElementById('tab-pwd');
const tabMail = document.getElementById('tab-mail');
const formPwd = document.getElementById('form-pwd');
const formMail = document.getElementById('form-mail');
const formRegister = document.getElementById('form-register');

tabPwd.onclick = function() {
    tabPwd.classList.add('active');
    tabMail.classList.remove('active');
    formPwd.style.display = '';
    formMail.style.display = 'none';
}
tabMail.onclick = function() {
    tabMail.classList.add('active');
    tabPwd.classList.remove('active');
    formMail.style.display = '';
    formPwd.style.display = 'none';
}

// 验证码/人机校验图刷新（这里只做演示）
function refreshCaptcha() {
    document.getElementById('captcha-img').innerText = '刷新成功';
    setTimeout(()=>{
        document.getElementById('captcha-img').innerText = '点击刷新';
    }, 900);
}
document.getElementById('captcha-img').onclick = refreshCaptcha;

// 账号密码登录表单提交
formPwd.onsubmit = async function(e) {
    e.preventDefault();
    const data = {
        username: formPwd.username.value.trim(),
        password: formPwd.password.value.trim(),
        verification: formPwd.verification.value.trim()
    };
    if (!data.username || !data.password || !data.verification) {
        setMsg('pwd', '请填写全部信息');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/auth/login/pwd`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        console.log('HTTP状态码:', res.status, res.statusText); // 调试信息
        if (!res.ok) {
            const text = await res.text();
            console.error('响应错误:', text); // 调试信息
            setMsg('pwd', `请求失败：${res.status} ${res.statusText}`);
            return;
        }
        const json = await res.json();
        console.log('登录响应:', json); // 调试信息
        showLoginResult('pwd', json);
    } catch (err) {
        console.error('登录错误:', err); // 调试信息
        setMsg('pwd', `网络错误：${err.message || '无法连接到服务器'}`);
    }
}

// 邮箱验证码登录提交
formMail.onsubmit = async function(e) {
    e.preventDefault();
    const data = {
        email: formMail.email.value.trim(),
        verification: formMail['mail-verification'].value.trim()
    };
    if (!data.email || !data.verification) {
        setMsg('mail', '请填写全部信息');
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/auth/login/mail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        console.log('邮箱登录响应:', json); // 调试信息
        showLoginResult('mail', json);
    } catch (err) {
        console.error('邮箱登录错误:', err); // 调试信息
        setMsg('mail', '网络错误！');
    }
}

// 用户注册提交
formRegister.onsubmit = async function(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const realName = document.getElementById('reg-name').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const passwordConfirm = document.getElementById('reg-passwordConfirm').value.trim();
    const identity = parseInt(document.getElementById('reg-identity').value, 10);
    if (!username || !realName || !password || !passwordConfirm || Number.isNaN(identity)) {
        setMsg('register', '请填写全部信息');
        return;
    }
    if (password !== passwordConfirm) {
        setMsg('register', '两次输入的密码不一致');
        return;
    }
    if (identity < 1 || identity > 5) {
        setMsg('register', '身份类型必须是1-5之间的整数');
        return;
    }
    const payload = { username, name: realName, password, passwordConfirm, identity };
    console.log('注册提交参数:', payload); // 调试信息，确认 name 参数已包含
    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        setMsg('register', json.message || (json.code===200? '注册成功' : '注册失败'));
        if (json.code===200) {
            setTimeout(()=>{
                alert('注册成功！请使用账号登录');
            }, 300);
        }
    } catch (err) {
        setMsg('register', '网络错误！');
    }
}

// 邮箱验证码获取逻辑（带冷却）
const getCodeBtn = document.getElementById('get-code-btn');
let timer = null, sec = 60;
getCodeBtn.onclick = async function() {
    const email = document.getElementById('email').value.trim();
    if (!email) {
        setMsg('mail', '请先输入邮箱');
        return;
    }
    getCodeBtn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/api/auth/code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const json = await res.json();
        setMsg('mail', json.message || '验证码发送请求已提交');
        if (json.code===200) {
            countDown();
        } else {
            getCodeBtn.disabled = false;
        }
    } catch {
        setMsg('mail', '发送失败'); getCodeBtn.disabled = false;
    }
};
function countDown() {
    sec = 60;
    getCodeBtn.textContent = sec + 's后重试';
    timer = setInterval(() => {
        sec--;
        getCodeBtn.textContent = sec + 's后重试';
        if (sec <= 0) {
            clearInterval(timer);
            getCodeBtn.textContent = '获取验证码';
            getCodeBtn.disabled = false;
        }
    }, 1000);
}

// 登录结果展示和消息提示
function showLoginResult(type, json) {
    if(type==='pwd') setMsg('pwd', json.message || '未知错误');
    if(type==='mail') setMsg('mail', json.message || '未知错误');
    
    // 判断登录成功：根据文档，token字段值为"1"表示成功，"0"表示不成功
    // 后端可能返回：{code: 200, token: '1'} 或 {code: 200, data: '1'}
    const code = json.code;
    const token = json.token || json.Token || json.accessToken || json.access_token || json.data;
    // token为"1"或1表示成功，其他值表示失败
    const tokenValue = String(token).trim();
    const isSuccess = (code === 200 || code === '200') && (tokenValue === '1' || tokenValue === 'true');
    
    console.log('登录判断:', { code, token, tokenValue, isSuccess }); // 调试信息
    
    if (isSuccess) {
        setTimeout(()=>{
            try { 
                // 保存token值（可能是"1"或其他实际的token字符串）
                localStorage.setItem('auth_token', tokenValue);
                console.log('Token已保存，准备跳转'); // 调试信息
            } catch (e) {
                console.error('保存Token失败:', e);
            }
            window.location.href = 'index.html';
        }, 300);
    } else {
        console.log('登录未成功，不跳转'); // 调试信息
    }
}
function setMsg(type, msg) {
    const id = type==='pwd' ? 'msg-pwd' : (type==='mail' ? 'msg-mail' : 'msg-register');
    document.getElementById(id).textContent = msg||'';
}
