const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, '店铺名称是必填项'], 
    unique: true, 
    trim: true,
    minlength: [2, '店铺名称至少需要2个字符'],
    maxlength: [100, '店铺名称不能超过100个字符']
  },
  type: {
    type: String,
    enum: ['physical', 'online', 'virtual'],
    default: 'physical',
    required: [true, '店铺类型是必填项']
  },
  description: { 
    type: String, 
    maxlength: [1000, '店铺描述不能超过1000个字符'],
    default: ''
  },
  logo: { 
    type: String, 
    default: '' 
  },
  coverImage: { 
    type: String, 
    default: '' 
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, '店铺所有者是必填项']
  },
  employees: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    role: { 
      type: String, 
      enum: ['owner', 'operator', 'staff'], 
      default: 'staff'
    },
    hiredAt: { 
      type: Date, 
      default: Date.now 
    },
    permissions: {
      canManageInventory: { 
        type: Boolean, 
        default: false 
      },
      canRecordSales: { 
        type: Boolean, 
        default: false 
      },
      canViewReports: { 
        type: Boolean, 
        default: false 
      },
      canManageEmployees: {
        type: Boolean, 
        default: false 
      }
    }
  }],
  location: {
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    province: { type: String, default: '' },
    postalCode: { type: String, default: '' }
  },
  contactInfo: {
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
    socialMedia: {
      wechat: { type: String, default: '' },
      qq: { type: String, default: '' }
    }
  },
  businessHours: {
    openTime: { type: String, default: '09:00' },
    closeTime: { type: String, default: '21:00' },
    workdays: { 
      type: [String],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    }
  },
  salesRecords: [{
    item: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'InventoryItem' 
    },
    quantity: { 
      type: Number, 
      required: [true, '数量是必填项'],
      min: [1, '数量至少为1']
    },
    unitPrice: { 
      type: Number, 
      required: [true, '单价是必填项'],
      min: [0, '单价不能为负数']
    },
    totalPrice: { 
      type: Number, 
      required: [true, '总价是必填项'],
      min: [0, '总价不能为负数']
    },
    saleType: { 
      type: String, 
      enum: ['sell', 'buy', 'trade'],
      required: [true, '交易类型是必填项']
    },
    customerName: { type: String, default: '' },
    soldBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    soldAt: { 
      type: Date, 
      default: Date.now 
    },
    notes: { type: String, default: '' }
  }],
  financialStats: {
    totalRevenue: { 
      type: Number, 
      default: 0,
      min: [0, '总收入不能为负数']
    },
    totalExpenses: { 
      type: Number, 
      default: 0,
      min: [0, '总支出不能为负数']
    },
    monthlyRevenue: { 
      type: Number, 
      default: 0,
      min: [0, '月收入不能为负数']
    },
    lastUpdated: { 
      type: Date, 
      default: Date.now 
    }
  },
  shelves: [{
    name: {
      type: String,
      required: [true, '货架名称是必填项'],
      trim: true,
      minlength: [1, '货架名称至少需要1个字符'],
      maxlength: [50, '货架名称不能超过50个字符']
    },
    description: {
      type: String,
      maxlength: [200, '货架描述不能超过200个字符'],
      default: ''
    },
    capacity: {
      type: Number,
      default: 0,
      min: [0, '容量不能为负数']
    },
    items: [{
      inventoryItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShopInventoryItem'
      },
      quantity: {
        type: Number,
        default: 1,
        min: [1, '数量至少为1']
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    isPublic: { 
      type: Boolean, 
      default: true 
    },
    showSalesRecords: { 
      type: Boolean, 
      default: false 
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 索引优化
shopSchema.index({ owner: 1 });
shopSchema.index({ 'employees.user': 1 });
shopSchema.index({ name: 'text' });

module.exports = mongoose.model('Shop', shopSchema);
