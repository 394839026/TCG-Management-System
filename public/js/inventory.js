// 库存管理相关功能

// 全局变量
let currentView = 'card'; // 'card' 或 'list'
let inventoryItems = [];

// 显示库存页面
function showInventoryPage() {
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('userDashboard').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'none';
  document.getElementById('inventoryPage').style.display = 'block';
  document.getElementById('profilePage').style.display = 'none';
  document.getElementById('settingsPage').style.display = 'none';
  
  // 更新导航状态
  if (typeof updateNavState === 'function') {
    updateNavState('inventory');
  }
  
  // 根据角色显示/隐藏按钮
  const user = JSON.parse(localStorage.getItem('user'));
  const addButton = document.getElementById('add-item-btn');
  const importButton = document.getElementById('import-btn');
  
  if (user.role === 'user') {
    // 普通用户隐藏添加和导入按钮
    if (addButton) addButton.style.display = 'none';
    if (importButton) importButton.style.display = 'none';
  } else {
    // 管理员显示所有按钮
    if (addButton) addButton.style.display = 'inline-block';
    if (importButton) importButton.style.display = 'inline-block';
  }
  
  loadInventory();
  loadInventoryStats();
}

// 切换视图模式
function switchView(view) {
  currentView = view;
  
  // 更新按钮状态
  document.getElementById('cardViewBtn').classList.toggle('active', view === 'card');
  document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
  
  // 重新渲染列表
  displayInventoryList(inventoryItems);
}

// 加载库存列表
async function loadInventory() {
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
      inventoryItems = data.data;
      displayInventoryList(inventoryItems);
    } else {
      console.error('加载库存失败:', data.message);
    }
  } catch (error) {
    console.error('加载库存错误:', error);
  }
}

// 加载库存统计
async function loadInventoryStats() {
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
      displayInventoryStats(data.data);
    }
  } catch (error) {
    console.error('加载统计错误:', error);
  }
}

// 显示库存统计
function displayInventoryStats(stats) {
  document.getElementById('totalItems').textContent = stats.totalItems || 0;
  document.getElementById('totalValue').textContent = `¥${(stats.totalValue || 0).toFixed(2)}`;
  document.getElementById('itemTypes').textContent = stats.byType ? stats.byType.length : 0;
}

// 显示库存列表
function displayInventoryList(items) {
  const listDiv = document.getElementById('inventoryList');

  if (items.length === 0) {
    listDiv.innerHTML = '<p class="empty-message">暂无物品，点击"添加物品"开始吧！</p>';
    return;
  }

  // 根据当前视图模式渲染
  if (currentView === 'card') {
    renderCardView(listDiv, items);
  } else {
    renderListView(listDiv, items);
  }
}

// 渲染卡片视图
function renderCardView(container, items) {
  container.className = 'inventory-list card-view';
  container.innerHTML = items.map(item => `
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
        ${item.description ? `<div class="card-description">${escapeHtml(item.description)}</div>` : '<div class="card-description">无描述</div>'}
      </div>
      <div class="card-footer">
        <button onclick="editItem('${item._id || item.id}')" class="btn-edit-card">编辑</button>
        <button onclick="deleteItem('${item._id || item.id}')" class="btn-delete-card">删除</button>
      </div>
    </div>
  `).join('');
}

// 渲染列表视图
function renderListView(container, items) {
  container.className = 'inventory-list list-view';
  container.innerHTML = items.map(item => `
    <div class="list-item rarity-${item.rarity || 'common'}" data-id="${item._id || item.id}">
      <div class="item-icon">
        ${getItemIcon(item.itemType)}
      </div>
      <div class="item-info">
        <h4>${escapeHtml(item.itemName)}</h4>
        <div class="item-meta">
          <span>📦 ${getItemTypeText(item.itemType)}</span>
          ${item.rarity ? `<span>⭐ ${getRarityText(item.rarity)}</span>` : ''}
          <span>✨ ${getConditionText(item.condition)}</span>
          ${item.itemCode ? `<span>🔖 ${escapeHtml(item.itemCode)}</span>` : ''}
        </div>
        ${item.description ? `<div style="color: #999; font-size: 12px; margin-top: 5px;">${escapeHtml(item.description)}</div>` : ''}
      </div>
      <div class="item-stats">
        <div class="item-stat-box">
          <div class="label">数量</div>
          <div class="value">${item.quantity}</div>
        </div>
        <div class="item-stat-box">
          <div class="label">单价</div>
          <div class="value price">¥${(item.value || 0).toFixed(2)}</div>
        </div>
        <div class="item-stat-box">
          <div class="label">总价</div>
          <div class="value price">¥${((item.quantity || 0) * (item.value || 0)).toFixed(2)}</div>
        </div>
        <div class="list-item-actions">
          <button onclick="editItem('${item._id || item.id}')" class="btn-small btn-edit">编辑</button>
          <button onclick="deleteItem('${item._id || item.id}')" class="btn-small btn-delete">删除</button>
        </div>
      </div>
    </div>
  `).join('');
}

// 显示添加物品表单
function showAddItemForm() {
  document.getElementById('addItemForm').style.display = 'block';
  document.getElementById('addItemError').classList.remove('show');
  document.getElementById('addItemSuccess').textContent = '';
}

// 隐藏添加物品表单
function hideAddItemForm() {
  document.getElementById('addItemForm').style.display = 'none';
  // 清空表单
  document.getElementById('item-name').value = '';
  document.getElementById('item-quantity').value = '';
  document.getElementById('item-value').value = '0';
  document.getElementById('item-description').value = '';
}

// 处理添加物品
async function handleAddItem(event) {
  event.preventDefault();
  
  const token = localStorage.getItem('token');
  const errorDiv = document.getElementById('addItemError');
  const successDiv = document.getElementById('addItemSuccess');

  const itemData = {
    itemName: document.getElementById('item-name').value,
    itemType: document.getElementById('item-type').value,
    quantity: parseInt(document.getElementById('item-quantity').value),
    condition: document.getElementById('item-condition').value,
    value: parseFloat(document.getElementById('item-value').value) || 0,
    description: document.getElementById('item-description').value
  };

  try {
    const response = await fetch('/api/inventory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(itemData)
    });

    const data = await response.json();

    if (response.ok) {
      successDiv.textContent = data.message || '物品添加成功！';
      successDiv.style.display = 'block';
      errorDiv.classList.remove('show');
      
      // 延迟隐藏表单并刷新列表
      setTimeout(() => {
        hideAddItemForm();
        loadInventory();
        loadInventoryStats();
      }, 1000);
    } else {
      showError('addItemError', data.message || data.errors?.[0]?.msg || '添加失败');
      successDiv.style.display = 'none';
    }
  } catch (error) {
    console.error('添加物品失败:', error);
    showError('addItemError', '网络错误，请稍后重试');
    successDiv.style.display = 'none';
  }
}

// 编辑物品
function editItem(itemId) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  
  fetch(`/api/inventory/${itemId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const item = data.data;
      document.getElementById('edit-item-id').value = item._id || item.id;
      
      // 根据角色显示不同的编辑字段
      if (user.role === 'user') {
        // 普通用户只能看到数量字段
        document.querySelector('#editItemModal h3').textContent = '修改数量';
        document.getElementById('edit-item-name').parentElement.style.display = 'none';
        document.getElementById('edit-item-value').parentElement.parentElement.style.display = 'none';
      } else {
        // 管理员可以看到所有字段
        document.querySelector('#editItemModal h3').textContent = '编辑物品';
        document.getElementById('edit-item-name').parentElement.style.display = 'block';
        document.getElementById('edit-item-name').value = item.itemName;
        document.getElementById('edit-item-value').parentElement.parentElement.style.display = 'flex';
      }
      
      document.getElementById('edit-item-quantity').value = item.quantity;
      document.getElementById('edit-item-value').value = item.value;
      document.getElementById('editItemModal').style.display = 'flex';
    }
  })
  .catch(err => console.error('获取物品信息失败:', err));
}

// 关闭编辑模态框
function closeEditModal() {
  document.getElementById('editItemModal').style.display = 'none';
}

// 处理编辑物品
async function handleEditItem(event) {
  event.preventDefault();
  
  const token = localStorage.getItem('token');
  const itemId = parseInt(document.getElementById('edit-item-id').value);
  const user = JSON.parse(localStorage.getItem('user'));
  
  // 根据角色发送不同的数据
  let updateData;
  if (user.role === 'user') {
    // 普通用户只能修改数量
    updateData = {
      quantity: parseInt(document.getElementById('edit-item-quantity').value)
    };
  } else {
    // 管理员可以修改所有字段
    updateData = {
      itemName: document.getElementById('edit-item-name').value,
      quantity: parseInt(document.getElementById('edit-item-quantity').value),
      value: parseFloat(document.getElementById('edit-item-value').value) || 0
    };
  }

  try {
    const response = await fetch(`/api/inventory/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    if (response.ok) {
      alert('物品更新成功！');
      closeEditModal();
      loadInventory();
      loadInventoryStats();
    } else {
      alert(data.message || '更新失败');
    }
  } catch (error) {
    console.error('更新物品失败:', error);
    alert('网络错误，请稍后重试');
  }
}

// 删除物品
async function deleteItem(itemId) {
  if (!confirm('确定要删除这个物品吗？')) {
    return;
  }

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`/api/inventory/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      loadInventory();
      loadInventoryStats();
    } else {
      alert(data.message || '删除失败');
    }
  } catch (error) {
    console.error('删除物品失败:', error);
    alert('网络错误，请稍后重试');
  }
}

// 辅助函数：获取物品类型文本
function getItemTypeText(type) {
  const types = {
    'card': '卡牌',
    'booster': '补充包',
    'box': '盒装',
    'accessory': '配件',
    'other': '其他'
  };
  return types[type] || type;
}

// 辅助函数：获取稀有度文本
function getRarityText(rarity) {
  const rarities = {
    'common': '普通',
    'uncommon': '非普通',
    'rare': '稀有',
    'super_rare': '超稀有',
    'ultra_rare': '极稀有',
    'secret_rare': '秘密稀有',
    'other': '其他'
  };
  return rarities[rarity] || rarity;
}

// 辅助函数：获取物品图标
function getItemIcon(type) {
  const icons = {
    'card': '🎴',
    'booster': '📦',
    'box': '📥',
    'accessory': '🎁',
    'other': '📌'
  };
  return icons[type] || '📌';
}

// 辅助函数：获取状态文本
function getConditionText(condition) {
  const conditions = {
    'mint': '完美',
    'near_mint': '近完美',
    'excellent': '极佳',
    'good': '良好',
    'fair': '一般',
    'poor': '较差'
  };
  return conditions[condition] || condition;
}

// 辅助函数：转义HTML防止XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== Excel导入功能 ====================

// 显示导入模态框
function showImportModal() {
  document.getElementById('importModal').style.display = 'flex';
  document.getElementById('importResult').style.display = 'none';
  document.getElementById('importProgress').style.display = 'none';
  document.getElementById('import-file').value = '';
}

// 关闭导入模态框
function closeImportModal() {
  document.getElementById('importModal').style.display = 'none';
}

// 处理Excel导入
async function handleImport(event) {
  event.preventDefault();
  
  const fileInput = document.getElementById('import-file');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('请选择Excel文件');
    return;
  }
  
  const token = localStorage.getItem('token');
  const progressDiv = document.getElementById('importProgress');
  const resultDiv = document.getElementById('importResult');
  
  // 显示进度
  progressDiv.style.display = 'block';
  resultDiv.style.display = 'none';
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('/api/inventory/import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    progressDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    
    if (response.ok) {
      resultDiv.className = 'import-result success';
      resultDiv.innerHTML = `
        <p><strong>${data.message}</strong></p>
        <p>成功: ${data.data.success} 条</p>
        <p>失败: ${data.data.failed} 条</p>
        ${data.data.errors.length > 0 ? `
          <div class="import-errors">
            <p><strong>错误详情:</strong></p>
            ${data.data.errors.map(err => `
              <div class="import-error-item">
                第 ${err.row} 行: ${err.error}
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;
      
      // 刷新列表
      setTimeout(() => {
        loadInventory();
        loadInventoryStats();
      }, 1500);
    } else {
      resultDiv.className = 'import-result error';
      resultDiv.innerHTML = `<p>${data.message || '导入失败'}</p>`;
    }
  } catch (error) {
    console.error('导入失败:', error);
    progressDiv.style.display = 'none';
    resultDiv.className = 'import-result error';
    resultDiv.innerHTML = '<p>网络错误，请稍后重试</p>';
  }
}
