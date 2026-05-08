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
  // 赞助商列表
  sponsors: [{
    name: {
      type: String,
      required: [true, '赞助商名称是必填项']
    },
    logo: {
      type: String,
      default: ''
    },
    contactPerson: {
      type: String,
      default: ''
    },
    contactPhone: {
      type: String,
      default: ''
    },
    contactEmail: {
      type: String,
      default: ''
    },
    sponsorshipAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    sponsorshipType: {
      type: String,
      enum: ['cash', 'product', 'service', 'mixed'],
      default: 'cash'
    },
    contractStart: {
      type: Date
    },
    contractEnd: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'terminated'],
      default: 'active'
    },
    contractDocument: {
      type: String,
      default: ''
    },
    benefits: {
      type: String,
      default: '',
      maxlength: [1000, '权益描述不能超过1000个字符']
    },
    notes: {
      type: String,
      default: '',
      maxlength: [500, '备注不能超过500个字符']
    },
    signedDate: {
      type: Date,
      default: Date.now
    }
  }],
  // 签约战队列表
  signedTeams: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    sponsorshipAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    sponsorshipType: {
      type: String,
      enum: ['cash', 'product', 'service', 'mixed'],
      default: 'cash'
    },
    contractStart: {
      type: Date
    },
    contractEnd: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'terminated'],
      default: 'active'
    },
    contractDocument: {
      type: String,
      default: ''
    },
    benefits: {
      type: String,
      default: '',
      maxlength: [1000, '权益描述不能超过1000个字符']
    },
    notes: {
      type: String,
      default: '',
      maxlength: [500, '备注不能超过500个字符']
    },
    signedDate: {
      type: Date,
      default: Date.now
    }
  }],
  // 签约记录
  signingRecords: [{
    type: {
      type: String,
      enum: ['sponsor', 'team'],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    targetName: {
      type: String,
      required: true
    },
    action: {
      type: String,
      enum: ['sign', 'renew', 'terminate', 'expire'],
      required: true
    },
    amount: {
      type: Number,
      default: 0
    },
    date: {
      type: Date,
      default: Date.now
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      default: ''
    }
  }],
  // 签约统计
  signingStats: {
    totalSponsorshipRevenue: {
      type: Number,
      default: 0
    },
    activeSponsorCount: {
      type: Number,
      default: 0
    },
    activeTeamCount: {
      type: Number,
      default: 0
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
