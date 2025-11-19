# Git 操作完整教程

## 一、基本配置（首次使用需要配置）

### 1. 配置用户信息
```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱@example.com"
```

### 2. 查看配置
```bash
git config --list
```

---

## 二、日常操作流程

### 1. 查看当前状态
```bash
git status
```
查看哪些文件被修改、新增或删除

### 2. 添加文件到暂存区
```bash
# 添加所有修改的文件
git add .

# 添加特定文件
git add 文件名

# 添加多个文件
git add 文件1 文件2 文件3
```

### 3. 提交到本地仓库
```bash
git commit -m "提交说明：描述本次修改的内容"
```

**提交信息规范示例：**
- `git commit -m "修复登录界面验证码问题"`
- `git commit -m "添加用户ID显示功能"`
- `git commit -m "优化卡片布局为两列显示"`

### 4. 推送到远程仓库
```bash
# 推送到主分支
git push origin main

# 或者推送到 master 分支（根据你的分支名）
git push origin master
```

---

## 三、解决连接问题

### 问题：`fatal: unable to access 'https://...': Recv failure: Connection was reset`

#### 方法1：使用SSH代替HTTPS（推荐）
```bash
# 1. 查看当前远程仓库地址
git remote -v

# 2. 如果使用的是HTTPS，改为SSH
git remote set-url origin git@github.com:用户名/仓库名.git

# 例如：
# git remote set-url origin git@github.com:Feng-Yousanlang/-.git
```

#### 方法2：配置代理（如果使用代理）
```bash
# 设置HTTP代理
git config --global http.proxy http://127.0.0.1:端口号
git config --global https.proxy https://127.0.0.1:端口号

# 取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```

#### 方法3：增加超时时间
```bash
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
```

#### 方法4：使用GitHub CLI（gh）
```bash
# 安装 GitHub CLI 后
gh auth login
git push
```

---

## 四、完整操作示例

### 场景：提交当前所有修改并推送到远程

```bash
# 1. 查看状态
git status

# 2. 添加所有修改
git add .

# 3. 提交
git commit -m "更新登录界面：移除验证码，添加注册链接切换"

# 4. 推送到远程
git push origin main
```

---

## 五、常用命令速查

### 查看相关
```bash
git status              # 查看工作区状态
git log                 # 查看提交历史
git log --oneline       # 简洁版提交历史
git diff                # 查看未暂存的修改
git diff --staged       # 查看已暂存的修改
```

### 分支操作
```bash
git branch              # 查看所有分支
git branch 分支名        # 创建新分支
git checkout 分支名      # 切换到分支
git checkout -b 分支名   # 创建并切换到新分支
git merge 分支名         # 合并分支
```

### 远程操作
```bash
git remote -v           # 查看远程仓库
git remote add origin 仓库地址  # 添加远程仓库
git pull                # 拉取远程更新
git push origin 分支名   # 推送到指定分支
```

### 撤销操作
```bash
git restore 文件名       # 撤销工作区修改
git restore --staged 文件名  # 取消暂存
git reset --soft HEAD~1  # 撤销最后一次提交（保留修改）
git reset --hard HEAD~1   # 撤销最后一次提交（丢弃修改，谨慎使用）
```

---

## 六、针对你当前问题的解决方案

### 方案A：使用SSH（推荐）
```bash
# 1. 检查是否已有SSH密钥
ls ~/.ssh

# 2. 如果没有，生成SSH密钥
ssh-keygen -t ed25519 -C "你的邮箱"

# 3. 复制公钥内容
cat ~/.ssh/id_ed25519.pub

# 4. 在GitHub网站：Settings -> SSH and GPG keys -> New SSH key
#    粘贴公钥内容并保存

# 5. 修改远程仓库地址为SSH
git remote set-url origin git@github.com:Feng-Yousanlang/-.git

# 6. 测试连接
ssh -T git@github.com

# 7. 推送
git push origin main
```

### 方案B：重新配置HTTPS
```bash
# 1. 清除缓存的凭据
git credential-manager-core erase
# 或者在Windows上：
git credential-manager erase

# 2. 重新推送（会提示输入用户名和密码/Token）
git push origin main
```

### 方案C：使用GitHub Personal Access Token
```bash
# 1. 在GitHub网站：Settings -> Developer settings -> Personal access tokens
#    生成新的token（权限选择 repo）

# 2. 推送时使用token作为密码
git push origin main
# 用户名：你的GitHub用户名
# 密码：粘贴刚才生成的token
```

---

## 七、快速操作脚本

### Windows PowerShell 一键提交推送
```powershell
# 保存为 push.ps1
git add .
$message = Read-Host "请输入提交信息"
git commit -m $message
git push origin main
```

使用方法：
```powershell
.\push.ps1
```

---

## 八、注意事项

1. **提交前先查看状态**：`git status` 确认要提交的文件
2. **提交信息要清晰**：描述本次修改的主要内容
3. **推送前先拉取**：`git pull` 避免冲突
4. **重要代码先备份**：推送前确保代码已保存
5. **不要强制推送**：`git push --force` 会覆盖远程历史，谨慎使用

---

## 九、遇到冲突怎么办

```bash
# 1. 拉取远程更新
git pull origin main

# 2. 如果有冲突，Git会提示冲突文件
# 3. 打开冲突文件，手动解决冲突（查找 <<<<<<< 标记）
# 4. 解决后添加文件
git add 冲突文件

# 5. 完成合并
git commit -m "解决合并冲突"

# 6. 推送
git push origin main
```

---

## 十、当前推荐操作步骤

```bash
# 1. 查看当前状态
git status

# 2. 添加所有修改
git add .

# 3. 提交（根据你的实际修改内容修改提交信息）
git commit -m "完成登录界面优化和用户ID显示功能"

# 4. 如果使用SSH，先切换远程地址
git remote set-url origin git@github.com:Feng-Yousanlang/-.git

# 5. 推送
git push origin main
```

如果仍然遇到连接问题，可以尝试：
- 检查网络连接
- 使用VPN或代理
- 稍后重试
- 联系网络管理员检查防火墙设置

