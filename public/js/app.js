const API_URL = '/api/auth';

// 显示登录表单
function showLogin() {
  // 隐藏侧边栏和顶部导航
  if (document.getElementById('sidebar')) {
    document.getElementById('sidebar').style.display = 'none';
  }
  if (document.getElementById('topHeader')) {
    document.getElementById('topHeader').style.display = 'none';
  }
  document.body.classList.remove('desktop-layout');
  
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('userDashboard').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'none';
  if (document.getElementById('inventoryPage')) document.getElementById('inventoryPage').style.display = 'none';
  if (document.getElementById('profilePage')) document.getElementById('profilePage').style.display = 'none';
  if (document.getElementById('settingsPage')) document.getElementById('settingsPage').style.display = 'none';
  clearErrors();
}

// 显示注册表单
function showRegister() {
  // 隐藏侧边栏和顶部导航
  if (document.getElementById('sidebar')) {
    document.getElementById('sidebar').style.display = 'none';
  }
  if (document.getElementById('topHeader')) {
    document.getElementById('topHeader').style.display = 'none';
  }
  document.body.classList.remove('desktop-layout');
  
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('userDashboard').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'none';
  if (document.getElementById('inventoryPage')) document.getElementById('inventoryPage').style.display = 'none';
  if (document.getElementById('profilePage')) document.getElementById('profilePage').style.display = 'none';
  if (document.getElementById('settingsPage')) document.getElementById('settingsPage').style.display = 'none';
  clearErrors();
}

// 显示普通用户仪表板
function showUserDashboard(user) {
  // 显示侧边栏和顶部导航
  document.getElementById('sidebar').style.display = 'block';
  document.getElementById('topHeader').style.display = 'flex';
  document.body.classList.add('desktop-layout');
  
  // 更新用户信息
  document.getElementById('sidebarUser').textContent = user.username;
  document.getElementById('headerUsername').textContent = user.username;
  document.getElementById('headerAvatar').textContent = user.username.charAt(0).toUpperCase();
  
  // 隐藏登录注册表单
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('userDashboard').style.display = 'block';
  document.getElementById('adminDashboard').style.display = 'none';
  document.getElementById('inventoryPage').style.display = 'none';
  document.getElementById('profilePage').style.display = 'none';
  document.getElementById('settingsPage').style.display = 'none';
  document.getElementById('username').textContent = user.username;
  document.getElementById('userEmail').textContent = user.email;
  document.getElementById('userRole').textContent = getRoleText(user.role);
  
  // 更新导航状态
  updateNavState('dashboard');
}

// 返回仪表板
function showDashboard() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    showLogin();
    return;
  }
  if (user.role === 'admin' || user.role === 'superadmin') {
    showAdminDashboard(user);
  } else {
    showUserDashboard(user);
  }
}

// 显示管理员仪表板
function showAdminDashboard(user) {
  // 显示侧边栏和顶部导航
  document.getElementById('sidebar').style.display = 'block';
  document.getElementById('topHeader').style.display = 'flex';
  document.body.classList.add('desktop-layout');
  
  // 更新用户信息
  document.getElementById('sidebarUser').textContent = user.username + ' (' + getRoleText(user.role) + ')';
  document.getElementById('headerUsername').textContent = user.username;
  document.getElementById('headerAvatar').textContent = user.username.charAt(0).toUpperCase();
  
  // 隐藏登录注册表单
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('userDashboard').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';
  document.getElementById('inventoryPage').style.display = 'none';
  document.getElementById('profilePage').style.display = 'none';
  document.getElementById('settingsPage').style.display = 'none';
  document.getElementById('adminName').textContent = user.username;
  document.getElementById('adminRole').textContent = getRoleText(user.role);

  // 根据角色显示不同功能
  if (user.role === 'admin' || user.role === 'superadmin') {
    document.getElementById('createUserTab').style.display = 'block';
  }
  if (user.role === 'superadmin') {
    document.getElementById('manageRolesTab').style.display = 'block';
  }

  // 加载用户列表
  loadUserList();
}

// 显示个人主页
async function showProfilePage() {
  document.getElementById('userDashboard').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'none';
  document.getElementById('inventoryPage').style.display = 'none';
  document.getElementById('settingsPage').style.display = 'none';
  document.getElementById('profilePage').style.display = 'block';
  
  updateNavState('profile');

  const user = JSON.parse(localStorage.getItem('user'));
  
  // 显示用户信息
  document.getElementById('profileUsername').textContent = user.username;
  document.getElementById('profileRole').textContent = getRoleText(user.role);
  document.getElementById('profileEmail').textContent = user.email;
  
  // 显示头像占位符（使用用户名首字母）
  const avatarPlaceholder = document.getElementById('profileAvatar');
  avatarPlaceholder.textContent = user.username.charAt(0).toUpperCase();
  
  // 显示个人简介
  if (user.bio) {
    document.getElementById('profileBio').textContent = user.bio;
    document.getElementById('profileBioSection').style.display = 'block';
  } else {
    document.getElementById('profileBioSection').style.display = 'none';
  }

  // 加载用户库存统计
  await loadProfileInventoryStats();
  
  // 加载用户库存列表
  await loadProfileInventory();
}

// 显示设置页面
function showSettingsPage() {
  document.getElementById('userDashboard').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'none';
  document.getElementById('inventoryPage').style.display = 'none';
  document.getElementById('profilePage').style.display = 'none';
  document.getElementById('settingsPage').style.display = 'block';
  
  updateNavState('settings');

  const user = JSON.parse(localStorage.getItem('user'));
  
  // 填充表单
  document.getElementById('settings-username').value = user.username;
  document.getElementById('settings-email').value = user.email;
  document.getElementById('settings-bio').value = user.bio || '';
  
  // 加载主题设置
  const theme = user.settings?.theme || 'default';
  selectTheme(theme);
  
  // 加载颜色设置
  const primaryColor = user.settings?.primaryColor || '#667eea';
  document.getElementById('primaryColorPicker').value = primaryColor;
  document.getElementById('colorValue').textContent = primaryColor;
  
  // 加载视图偏好
  const cardView = user.settings?.cardView || 'card';
  const radioElement = document.querySelector(`input[name="cardView"][value="${cardView}"]`);
  if (radioElement) {
    radioElement.checked = true;
  }
  
  // 清除消息
  clearSettingsMessages();
}

// 显示设置标签页
function showSettingsTab(tabName) {
  // 隐藏所有标签内容
  document.querySelectorAll('.settings-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // 移除所有标签按钮的active类
  document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 显示选中的标签
  document.getElementById(`${tabName}SettingsTab`).classList.add('active');
  event.target.classList.add('active');
}

// 清除设置消息
function clearSettingsMessages() {
  const profileSuccess = document.getElementById('profileUpdateSuccess');
  const profileError = document.getElementById('profileUpdateError');
  const appearanceSuccess = document.getElementById('appearanceSuccess');
  const preferencesSuccess = document.getElementById('preferencesSuccess');
  
  if (profileSuccess) profileSuccess.style.display = 'none';
  if (profileError) {
    profileError.classList.remove('show');
    profileError.textContent = '';
  }
  if (appearanceSuccess) appearanceSuccess.style.display = 'none';
  if (preferencesSuccess) preferencesSuccess.style.display = 'none';
}

// 获取角色文本
function getRoleText(role) {
  const roleMap = {
    'user': '普通用户',
    'admin': '管理员',
    'superadmin': '超级管理员'
  };
  return roleMap[role] || role;
}

// 显示标签页
function showTab(tabName) {
  // 隐藏所有标签内容
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // 移除所有标签按钮的active类
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // 显示选中的标签
  if (tabName === 'users') {
    document.getElementById('usersTab').classList.add('active');
    event.target.classList.add('active');
  } else if (tabName === 'createUser') {
    document.getElementById('createUserTabContent').classList.add('active');
    event.target.classList.add('active');
  } else if (tabName === 'manageRoles') {
    document.getElementById('manageRolesTabContent').classList.add('active');
    event.target.classList.add('active');
  }
}

// 清除错误信息
function clearErrors() {
  document.getElementById('registerError').classList.remove('show');
  document.getElementById('loginError').classList.remove('show');
  document.getElementById('registerError').textContent = '';
  document.getElementById('loginError').textContent = '';

  const createUserError = document.getElementById('createUserError');
  const createUserSuccess = document.getElementById('createUserSuccess');
  if (createUserError) {
    createUserError.classList.remove('show');
    createUserError.textContent = '';
  }
  if (createUserSuccess) {
    createUserSuccess.textContent = '';
  }
}

// 显示错误信息
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  errorElement.textContent = message;
  errorElement.classList.add('show');
}

// 处理用户注册
async function handleRegister(event) {
  event.preventDefault();
  clearErrors();

  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data));

      if (data.data.role === 'admin' || data.data.role === 'superadmin') {
        showAdminDashboard(data.data);
      } else {
        showUserDashboard(data.data);
      }
    } else {
      showError('registerError', data.message || data.errors?.[0]?.msg || '注册失败');
    }
  } catch (error) {
    console.error('注册错误:', error);
    showError('registerError', '网络错误，请稍后重试');
  }
}

// 处理用户登录
async function handleLogin(event) {
  event.preventDefault();
  clearErrors();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data));

      if (data.data.role === 'admin' || data.data.role === 'superadmin') {
        showAdminDashboard(data.data);
      } else {
        showUserDashboard(data.data);
      }
    } else {
      showError('loginError', data.message || '登录失败');
    }
  } catch (error) {
    console.error('登录错误:', error);
    showError('loginError', '网络错误，请稍后重试');
  }
}

// 加载用户列表（管理员）
async function loadUserList() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      displayUserList(data.data);
      if (localStorage.getItem('user')) {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (currentUser.role === 'superadmin') {
          displayRoleManagementList(data.data);
        }
      }
    }
  } catch (error) {
    console.error('加载用户列表失败:', error);
  }
}

// 显示用户列表
function displayUserList(users) {
  const userListDiv = document.getElementById('userList');
  const currentUser = JSON.parse(localStorage.getItem('user'));

  if (users.length === 0) {
    userListDiv.innerHTML = '<p>暂无用户</p>';
    return;
  }

  userListDiv.innerHTML = users.map(user => `
    <div class="user-item">
      <div class="user-info-card">
        <h4>${user.username}</h4>
        <p><strong>邮箱:</strong> ${user.email}</p>
        <p><strong>角色:</strong> <span class="role-badge ${user.role}">${getRoleText(user.role)}</span></p>
      </div>
    </div>
  `).join('');
}

// 显示角色管理列表（超级管理员）
function displayRoleManagementList(users) {
  const roleListDiv = document.getElementById('roleManagementList');
  const currentUser = JSON.parse(localStorage.getItem('user'));

  if (users.length === 0) {
    roleListDiv.innerHTML = '<p>暂无用户</p>';
    return;
  }

  roleListDiv.innerHTML = users.map(user => {
    const isCurrentUser = user.id === currentUser._id || user._id === currentUser._id;
    return `
      <div class="user-item">
        <div class="user-info-card">
          <h4>${user.username} ${isCurrentUser ? '(我)' : ''}</h4>
          <p><strong>邮箱:</strong> ${user.email}</p>
          <p><strong>当前角色:</strong> <span class="role-badge ${user.role}">${getRoleText(user.role)}</span></p>
        </div>
        ${!isCurrentUser ? `
          <div class="user-actions">
            <div class="role-selector">
              <select id="role-${user.id || user._id}" onchange="updateUserRole('${user.id || user._id}')">
                <option value="user" ${user.role === 'user' ? 'selected' : ''}>普通用户</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理员</option>
                <option value="superadmin" ${user.role === 'superadmin' ? 'selected' : ''}>超级管理员</option>
              </select>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// 更新用户角色
async function updateUserRole(userId) {
  const token = localStorage.getItem('token');
  const selectElement = document.getElementById(`role-${userId}`);
  const newRole = selectElement.value;

  if (!confirm('确定要修改该用户的角色吗？')) {
    loadUserList(); // 恢复原状
    return;
  }

  try {
    const response = await fetch(`${API_URL}/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role: newRole })
    });

    const data = await response.json();

    if (response.ok) {
      alert('角色更新成功！');
      loadUserList(); // 重新加载列表
    } else {
      alert(data.message || '更新失败');
      loadUserList(); // 恢复原状
    }
  } catch (error) {
    console.error('更新角色失败:', error);
    alert('网络错误，请稍后重试');
    loadUserList();
  }
}

// 管理员创建用户
async function handleAdminCreateUser(event) {
  event.preventDefault();

  const username = document.getElementById('new-username').value;
  const email = document.getElementById('new-email').value;
  const password = document.getElementById('new-password').value;
  const token = localStorage.getItem('token');

  const errorDiv = document.getElementById('createUserError');
  const successDiv = document.getElementById('createUserSuccess');

  try {
    const response = await fetch(`${API_URL}/admin/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (response.ok) {
      successDiv.textContent = data.message || '用户创建成功！';
      successDiv.style.display = 'block';
      errorDiv.classList.remove('show');

      // 清空表单
      document.getElementById('new-username').value = '';
      document.getElementById('new-email').value = '';
      document.getElementById('new-password').value = '';

      // 刷新用户列表
      loadUserList();
    } else {
      showError('createUserError', data.message || data.errors?.[0]?.msg || '创建失败');
      successDiv.style.display = 'none';
    }
  } catch (error) {
    console.error('创建用户失败:', error);
    showError('createUserError', '网络错误，请稍后重试');
    successDiv.style.display = 'none';
  }
}

// ==================== 个人主页功能 ====================

// 加载个人主页库存统计
async function loadProfileInventoryStats() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch('/api/inventory/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById('profileTotalItems').textContent = data.data.totalItems || 0;
      document.getElementById('profileTotalValue').textContent = `¥${(data.data.totalValue || 0).toFixed(2)}`;
      document.getElementById('profileItemTypes').textContent = data.data.byType ? data.data.byType.length : 0;
    }
  } catch (error) {
    console.error('加载统计错误:', error);
  }
}

// 加载个人主页库存列表
async function loadProfileInventory() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch('/api/inventory', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      const listDiv = document.getElementById('profileInventoryList');
      
      if (data.data.length === 0) {
        listDiv.innerHTML = '<p class="empty-message">暂无物品</p>';
        return;
      }

      // 只显示前6个物品
      const displayItems = data.data.slice(0, 6);
      
      listDiv.className = 'inventory-list card-view';
      listDiv.innerHTML = displayItems.map(item => `
        <div class="card-item rarity-${item.rarity || 'common'}" data-id="${item._id || item.id}">
          <div class="card-header">
            <h3 class="card-title">${escapeHtml(item.itemName)}</h3>
            <div class="card-badges">
              <span class="badge">${getItemTypeText(item.itemType)}</span>
              ${item.rarity ? `<span class="badge">${getRarityText(item.rarity)}</span>` : ''}
            </div>
          </div>
          <div class="card-body">
            <div class="card-stats">
              <div class="stat-item">
                <div class="label">数量</div>
                <div class="value">${item.quantity}</div>
              </div>
              <div class="stat-item">
                <div class="label">状态</div>
                <div class="value">${getConditionText(item.condition)}</div>
              </div>
              <div class="stat-item">
                <div class="label">单价</div>
                <div class="value price">¥${(item.value || 0).toFixed(2)}</div>
              </div>
              <div class="stat-item">
                <div class="label">总价</div>
                <div class="value price">¥${((item.quantity || 0) * (item.value || 0)).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('加载库存错误:', error);
  }
}

// ==================== 设置功能 ====================

// 更新个人资料
async function handleUpdateProfile(event) {
  event.preventDefault();
  
  const token = localStorage.getItem('token');
  const username = document.getElementById('settings-username').value;
  const email = document.getElementById('settings-email').value;
  const bio = document.getElementById('settings-bio').value;
  
  const successDiv = document.getElementById('profileUpdateSuccess');
  const errorDiv = document.getElementById('profileUpdateError');
  
  try {
    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username, email, bio })
    });

    const data = await response.json();

    if (response.ok) {
      // 更新本地存储的用户信息
      const user = JSON.parse(localStorage.getItem('user'));
      user.username = username;
      user.email = email;
      user.bio = bio;
      localStorage.setItem('user', JSON.stringify(user));
      
      successDiv.textContent = data.message || '资料更新成功！';
      successDiv.style.display = 'block';
      errorDiv.classList.remove('show');
      
      // 延迟隐藏成功消息
      setTimeout(() => {
        successDiv.style.display = 'none';
      }, 3000);
    } else {
      showError('profileUpdateError', data.message || data.errors?.[0]?.msg || '更新失败');
      successDiv.style.display = 'none';
    }
  } catch (error) {
    console.error('更新资料失败:', error);
    showError('profileUpdateError', '网络错误，请稍后重试');
    successDiv.style.display = 'none';
  }
}

// 选择主题
let selectedTheme = 'default';
function selectTheme(theme) {
  selectedTheme = theme;
  
  // 更新UI
  document.querySelectorAll('.theme-option').forEach(option => {
    option.classList.remove('selected');
  });
  document.querySelector(`.theme-option[data-theme="${theme}"]`).classList.add('selected');
}

// 更新主色调
function updatePrimaryColor(color) {
  document.getElementById('colorValue').textContent = color;
}

// 保存外观设置
async function saveAppearanceSettings() {
  const token = localStorage.getItem('token');
  const primaryColor = document.getElementById('primaryColorPicker').value;
  
  const successDiv = document.getElementById('appearanceSuccess');
  
  try {
    const response = await fetch('/api/auth/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        theme: selectedTheme,
        primaryColor: primaryColor
      })
    });

    const data = await response.json();

    if (response.ok) {
      // 更新本地存储
      const user = JSON.parse(localStorage.getItem('user'));
      user.settings.theme = selectedTheme;
      user.settings.primaryColor = primaryColor;
      localStorage.setItem('user', JSON.stringify(user));
      
      // 应用主题
      applyTheme(selectedTheme, primaryColor);
      
      successDiv.textContent = '外观设置已保存！';
      successDiv.style.display = 'block';
      
      setTimeout(() => {
        successDiv.style.display = 'none';
      }, 3000);
    }
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

// 保存偏好设置
async function savePreferences() {
  const token = localStorage.getItem('token');
  const cardView = document.querySelector('input[name="cardView"]:checked').value;
  
  const successDiv = document.getElementById('preferencesSuccess');
  
  try {
    const response = await fetch('/api/auth/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ cardView })
    });

    const data = await response.json();

    if (response.ok) {
      // 更新本地存储
      const user = JSON.parse(localStorage.getItem('user'));
      user.settings.cardView = cardView;
      localStorage.setItem('user', JSON.stringify(user));
      
      successDiv.textContent = '偏好设置已保存！';
      successDiv.style.display = 'block';
      
      setTimeout(() => {
        successDiv.style.display = 'none';
      }, 3000);
    }
  } catch (error) {
    console.error('保存偏好失败:', error);
  }
}

// 应用主题
function applyTheme(theme, primaryColor) {
  document.body.className = `theme-${theme}`;
  document.documentElement.style.setProperty('--primary-color', primaryColor);
}

// 更新导航状态
function updateNavState(activePage) {
  // 移除所有active类
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  
  // 添加active类到当前页面
  const navId = 'nav-' + activePage;
  const navElement = document.getElementById(navId);
  if (navElement) {
    navElement.classList.add('active');
  }
}

// 处理退出登录
function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // 隐藏侧边栏和顶部导航
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('topHeader').style.display = 'none';
  document.body.classList.remove('desktop-layout');
  
  showLogin();
}

// 页面加载时检查是否已登录
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (token && user) {
    const userData = JSON.parse(user);
    
    // 应用用户设置的主题
    if (userData.settings) {
      applyTheme(userData.settings.theme || 'default', userData.settings.primaryColor || '#667eea');
    }
    
    if (userData.role === 'admin' || userData.role === 'superadmin') {
      showAdminDashboard(userData);
    } else {
      showUserDashboard(userData);
    }
  } else {
    showLogin();
  }
});
