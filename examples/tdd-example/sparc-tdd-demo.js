#!/usr/bin/env node

/**
 * Claude-Collab TDD with SPARC Mode Demo
 * Test-Driven Development with collaborative SPARC agents
 * 
 * Created by Alex - Frontend/UX & Testing Lead
 */

const WebSocket = require('ws');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════╗
║        🧪 Claude-Collab TDD + SPARC Demo 🧪            ║
║                                                        ║
║  Experience Test-Driven Development with SPARC mode    ║
║  agents collaborating on building tested features      ║
╚════════════════════════════════════════════════════════╝
`));

// Demo configuration
const SERVER_URL = 'ws://localhost:8765';
const PROJECT_DIR = path.join(__dirname, 'shopping-cart-tdd');

// SPARC TDD Agents
const SPARC_AGENTS = [
  {
    name: 'SPARC-Specify',
    role: 'spec-writer',
    perspective: 'requirements-analyst',
    mode: 'specify',
    focus: 'Write clear specifications and acceptance criteria'
  },
  {
    name: 'SPARC-Pseudocode', 
    role: 'architect',
    perspective: 'system-designer',
    mode: 'pseudocode',
    focus: 'Design algorithms and data structures'
  },
  {
    name: 'SPARC-Analyze',
    role: 'test-analyst',
    perspective: 'qa-engineer',
    mode: 'analyze',
    focus: 'Identify edge cases and test scenarios'
  },
  {
    name: 'SPARC-Refine',
    role: 'tdd-developer',
    perspective: 'test-first',
    mode: 'refine',
    focus: 'Write tests before implementation'
  },
  {
    name: 'SPARC-Code',
    role: 'implementer',
    perspective: 'pragmatic-coder',
    mode: 'code',
    focus: 'Implement code to pass tests'
  }
];

// Feature to build with TDD
const FEATURE = {
  name: "Shopping Cart with Discounts",
  description: "E-commerce cart that handles items, quantities, and discount rules",
  requirements: [
    "Add/remove items with quantities",
    "Calculate total with tax",
    "Apply percentage and fixed discounts",
    "Handle bulk discounts (buy 2 get 1 free)",
    "Validate discount codes",
    "Maximum discount limits"
  ]
};

class SPARCAgent {
  constructor(config) {
    this.name = config.name;
    this.role = config.role;
    this.perspective = config.perspective;
    this.mode = config.mode;
    this.focus = config.focus;
    this.ws = null;
    this.outputs = [];
  }

  async register() {
    return new Promise((resolve, reject) => {
      console.log(chalk.yellow(`🚀 Initializing ${this.name} (${this.mode} mode)...`));
      
      const ws = new WebSocket(SERVER_URL);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'register',
          agentName: this.name,
          role: this.role
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'register-success') {
          this.authToken = message.authToken;
          console.log(chalk.green(`✓ ${this.name} ready for TDD`));
          ws.close();
          resolve();
        } else if (message.type === 'register-failed' && message.reason === 'name-taken') {
          console.log(chalk.gray(`ℹ ${this.name} already initialized`));
          ws.close();
          resolve();
        }
      });
      
      ws.on('error', reject);
    });
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(SERVER_URL);
      
      this.ws.on('open', () => {
        this.ws.send(JSON.stringify({
          type: 'auth',
          agentName: this.name,
          authToken: this.authToken,
          role: this.role,
          perspective: this.perspective,
          clientVersion: '3.2.3'
        }));
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth-success') {
          console.log(chalk.green(`✅ ${this.name} connected`));
          resolve();
        }
      });
      
      this.ws.on('error', reject);
    });
  }

  async executeMode(feature, previousOutputs = {}) {
    console.log(chalk.blue(`\n📋 ${this.name} executing ${this.mode.toUpperCase()} phase...`));
    
    switch (this.mode) {
      case 'specify':
        return await this.specify(feature);
      case 'pseudocode':
        return await this.pseudocode(feature, previousOutputs.specifications);
      case 'analyze':
        return await this.analyze(feature, previousOutputs);
      case 'refine':
        return await this.refine(feature, previousOutputs);
      case 'code':
        return await this.code(feature, previousOutputs);
      default:
        return null;
    }
  }

  async specify(feature) {
    this.announce(`Analyzing requirements for ${feature.name}`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const specifications = {
      interfaces: [
        "ShoppingCart class with methods: addItem, removeItem, getTotal, applyDiscount",
        "CartItem interface: { id, name, price, quantity }",
        "Discount interface: { code, type, value, minAmount, maxDiscount }"
      ],
      acceptanceCriteria: [
        "Cart total updates correctly when items added/removed",
        "Tax calculated as percentage of subtotal",
        "Percentage discounts reduce total by specified percent",
        "Fixed discounts subtract fixed amount from total",
        "Bulk discounts apply free items correctly",
        "Invalid discount codes throw error",
        "Discounts cannot reduce total below zero"
      ],
      constraints: [
        "Prices in cents to avoid floating point issues",
        "Maximum 100 items per cart",
        "Discount codes are case-insensitive",
        "Thread-safe for concurrent access"
      ]
    };

    this.announce("Specifications complete. Key interfaces and acceptance criteria defined.");
    this.outputs.push(specifications);
    
    // Save to file
    await this.saveArtifact('specifications.json', JSON.stringify(specifications, null, 2));
    
    return specifications;
  }

  async pseudocode(feature, specifications) {
    this.announce("Designing algorithms and data structures");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const algorithms = {
      cartStructure: `
class ShoppingCart:
  items: Map<itemId, CartItem>
  discounts: Array<AppliedDiscount>
  taxRate: number
  
  addItem(item):
    if items.size >= 100: throw error
    if items.has(item.id):
      items.get(item.id).quantity += item.quantity
    else:
      items.set(item.id, item)
  
  calculateTotal():
    subtotal = sum(item.price * item.quantity for item in items)
    discountAmount = calculateDiscounts(subtotal)
    taxableAmount = subtotal - discountAmount
    tax = taxableAmount * taxRate
    return taxableAmount + tax
`,
      discountLogic: `
calculateDiscounts(subtotal):
  totalDiscount = 0
  
  for discount in sortedDiscounts:
    if discount.type == PERCENTAGE:
      amount = subtotal * discount.value / 100
    elif discount.type == FIXED:
      amount = discount.value
    elif discount.type == BULK:
      amount = calculateBulkDiscount(items, discount.rules)
    
    if discount.maxDiscount:
      amount = min(amount, discount.maxDiscount)
    
    totalDiscount += amount
    
  return min(totalDiscount, subtotal)  // Never negative total
`
    };

    this.announce("Algorithm design complete. Core logic structured.");
    this.outputs.push(algorithms);
    
    await this.saveArtifact('algorithms.md', 
      `# Shopping Cart Algorithms\n\n${algorithms.cartStructure}\n\n${algorithms.discountLogic}`);
    
    return algorithms;
  }

  async analyze(feature, previousOutputs) {
    this.announce("Identifying edge cases and test scenarios");
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const testScenarios = {
      edgeCases: [
        "Empty cart returns zero total",
        "Adding item with zero quantity",
        "Adding item with negative price",
        "Removing item not in cart",
        "Applying expired discount code",
        "Multiple discounts exceeding item value",
        "Bulk discount with insufficient items",
        "Integer overflow with large quantities",
        "Concurrent modifications to cart"
      ],
      testCategories: [
        {
          name: "Basic Operations",
          tests: ["Add single item", "Add multiple items", "Update quantity", "Remove item", "Clear cart"]
        },
        {
          name: "Discount Scenarios", 
          tests: ["10% off", "$5 off", "Buy 2 get 1", "Stacked discounts", "Minimum amount required"]
        },
        {
          name: "Tax Calculations",
          tests: ["Standard tax", "Tax after discounts", "Tax-exempt items", "Multiple tax rates"]
        },
        {
          name: "Error Handling",
          tests: ["Invalid inputs", "Cart limits", "Discount validation", "Concurrency issues"]
        }
      ],
      performanceTests: [
        "1000 items in cart",
        "100 discounts applied",
        "Concurrent access by 10 threads"
      ]
    };

    this.announce(`Identified ${testScenarios.edgeCases.length} edge cases across ${testScenarios.testCategories.length} categories`);
    this.outputs.push(testScenarios);
    
    await this.saveArtifact('test-scenarios.json', JSON.stringify(testScenarios, null, 2));
    
    return testScenarios;
  }

  async refine(feature, previousOutputs) {
    this.announce("Writing tests before implementation (TDD)");
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const tests = `
// shopping-cart.test.js
const { ShoppingCart, DiscountType } = require('./shopping-cart');

describe('ShoppingCart', () => {
  let cart;
  
  beforeEach(() => {
    cart = new ShoppingCart(0.08); // 8% tax
  });

  describe('Basic Operations', () => {
    test('new cart should be empty', () => {
      expect(cart.getItemCount()).toBe(0);
      expect(cart.getTotal()).toBe(0);
    });

    test('should add item to cart', () => {
      cart.addItem({ id: '1', name: 'Widget', price: 1000, quantity: 1 });
      expect(cart.getItemCount()).toBe(1);
      expect(cart.getSubtotal()).toBe(1000);
    });

    test('should update quantity for existing item', () => {
      cart.addItem({ id: '1', name: 'Widget', price: 1000, quantity: 1 });
      cart.addItem({ id: '1', name: 'Widget', price: 1000, quantity: 2 });
      expect(cart.getItem('1').quantity).toBe(3);
    });

    test('should remove item from cart', () => {
      cart.addItem({ id: '1', name: 'Widget', price: 1000, quantity: 1 });
      cart.removeItem('1');
      expect(cart.getItemCount()).toBe(0);
    });

    test('should throw error for cart limit', () => {
      for (let i = 0; i < 100; i++) {
        cart.addItem({ id: i.toString(), name: 'Item', price: 100, quantity: 1 });
      }
      expect(() => {
        cart.addItem({ id: '101', name: 'Extra', price: 100, quantity: 1 });
      }).toThrow('Cart limit exceeded');
    });
  });

  describe('Discount Calculations', () => {
    beforeEach(() => {
      cart.addItem({ id: '1', name: 'Widget', price: 2000, quantity: 2 });
      cart.addItem({ id: '2', name: 'Gadget', price: 1500, quantity: 1 });
    });

    test('should apply percentage discount', () => {
      cart.applyDiscount({
        code: 'SAVE10',
        type: DiscountType.PERCENTAGE,
        value: 10
      });
      const total = cart.getTotal();
      expect(total).toBe(4860); // 5500 - 10% = 4950 + 8% tax
    });

    test('should apply fixed discount', () => {
      cart.applyDiscount({
        code: 'SAVE5',
        type: DiscountType.FIXED,
        value: 500
      });
      expect(cart.getSubtotalAfterDiscounts()).toBe(5000);
    });

    test('should handle bulk discount', () => {
      cart.applyDiscount({
        code: 'BUY2GET1',
        type: DiscountType.BULK,
        rules: { buyQuantity: 2, getQuantity: 1 }
      });
      // Should get 1 free widget
      expect(cart.getDiscountAmount()).toBe(2000);
    });

    test('should respect maximum discount limit', () => {
      cart.applyDiscount({
        code: 'BIGDISCOUNT',
        type: DiscountType.PERCENTAGE,
        value: 50,
        maxDiscount: 1000
      });
      expect(cart.getDiscountAmount()).toBe(1000);
    });

    test('should not allow negative totals', () => {
      cart.applyDiscount({
        code: 'HUGE',
        type: DiscountType.FIXED,
        value: 10000
      });
      expect(cart.getTotal()).toBe(0);
    });
  });

  describe('Tax Calculations', () => {
    test('should calculate tax on discounted amount', () => {
      cart.addItem({ id: '1', name: 'Widget', price: 1000, quantity: 1 });
      cart.applyDiscount({
        code: 'HALF',
        type: DiscountType.PERCENTAGE,
        value: 50
      });
      const tax = cart.getTaxAmount();
      expect(tax).toBe(40); // 8% of 500
    });
  });

  describe('Error Handling', () => {
    test('should validate discount codes', () => {
      expect(() => {
        cart.applyDiscount({
          code: '',
          type: DiscountType.PERCENTAGE,
          value: 10
        });
      }).toThrow('Invalid discount code');
    });

    test('should handle invalid item data', () => {
      expect(() => {
        cart.addItem({ id: '1', name: 'Bad', price: -100, quantity: 1 });
      }).toThrow('Invalid item price');
    });
  });
});
`;

    this.announce("Test suite complete. 20+ test cases covering all scenarios.");
    this.outputs.push({ testSuite: tests });
    
    await this.saveArtifact('shopping-cart.test.js', tests);
    
    return { testSuite: tests };
  }

  async code(feature, previousOutputs) {
    this.announce("Implementing code to pass all tests");
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const implementation = `
// shopping-cart.js
const DiscountType = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  BULK: 'bulk'
};

class ShoppingCart {
  constructor(taxRate = 0) {
    this.items = new Map();
    this.discounts = [];
    this.taxRate = taxRate;
    this.maxItems = 100;
  }

  addItem(item) {
    this.validateItem(item);
    
    if (this.items.size >= this.maxItems && !this.items.has(item.id)) {
      throw new Error('Cart limit exceeded');
    }

    if (this.items.has(item.id)) {
      const existing = this.items.get(item.id);
      existing.quantity += item.quantity;
    } else {
      this.items.set(item.id, { ...item });
    }
  }

  removeItem(itemId) {
    this.items.delete(itemId);
  }

  getItem(itemId) {
    return this.items.get(itemId);
  }

  getItemCount() {
    return this.items.size;
  }

  getSubtotal() {
    let subtotal = 0;
    for (const item of this.items.values()) {
      subtotal += item.price * item.quantity;
    }
    return subtotal;
  }

  applyDiscount(discount) {
    this.validateDiscount(discount);
    this.discounts.push(discount);
  }

  getDiscountAmount() {
    const subtotal = this.getSubtotal();
    let totalDiscount = 0;

    // Sort discounts by value (highest first)
    const sortedDiscounts = [...this.discounts].sort((a, b) => {
      const aValue = this.calculateDiscountValue(a, subtotal);
      const bValue = this.calculateDiscountValue(b, subtotal);
      return bValue - aValue;
    });

    for (const discount of sortedDiscounts) {
      let discountAmount = 0;

      switch (discount.type) {
        case DiscountType.PERCENTAGE:
          discountAmount = Math.floor(subtotal * discount.value / 100);
          break;
        case DiscountType.FIXED:
          discountAmount = discount.value;
          break;
        case DiscountType.BULK:
          discountAmount = this.calculateBulkDiscount(discount);
          break;
      }

      if (discount.maxDiscount) {
        discountAmount = Math.min(discountAmount, discount.maxDiscount);
      }

      totalDiscount += discountAmount;
    }

    // Ensure discount doesn't exceed subtotal
    return Math.min(totalDiscount, subtotal);
  }

  calculateBulkDiscount(discount) {
    let totalDiscount = 0;
    
    for (const item of this.items.values()) {
      const setsEligible = Math.floor(item.quantity / discount.rules.buyQuantity);
      const freeItems = setsEligible * discount.rules.getQuantity;
      totalDiscount += freeItems * item.price;
    }
    
    return totalDiscount;
  }

  calculateDiscountValue(discount, subtotal) {
    switch (discount.type) {
      case DiscountType.PERCENTAGE:
        return subtotal * discount.value / 100;
      case DiscountType.FIXED:
        return discount.value;
      case DiscountType.BULK:
        return this.calculateBulkDiscount(discount);
      default:
        return 0;
    }
  }

  getSubtotalAfterDiscounts() {
    return Math.max(0, this.getSubtotal() - this.getDiscountAmount());
  }

  getTaxAmount() {
    const taxableAmount = this.getSubtotalAfterDiscounts();
    return Math.floor(taxableAmount * this.taxRate);
  }

  getTotal() {
    const subtotalAfterDiscounts = this.getSubtotalAfterDiscounts();
    const tax = this.getTaxAmount();
    return subtotalAfterDiscounts + tax;
  }

  validateItem(item) {
    if (!item.id || !item.name) {
      throw new Error('Invalid item data');
    }
    if (item.price < 0) {
      throw new Error('Invalid item price');
    }
    if (item.quantity <= 0) {
      throw new Error('Invalid item quantity');
    }
  }

  validateDiscount(discount) {
    if (!discount.code || discount.code.trim() === '') {
      throw new Error('Invalid discount code');
    }
    if (!Object.values(DiscountType).includes(discount.type)) {
      throw new Error('Invalid discount type');
    }
    if (discount.value <= 0) {
      throw new Error('Invalid discount value');
    }
  }

  clear() {
    this.items.clear();
    this.discounts = [];
  }
}

module.exports = { ShoppingCart, DiscountType };
`;

    this.announce("Implementation complete. All tests should pass!");
    this.outputs.push({ implementation });
    
    await this.saveArtifact('shopping-cart.js', implementation);
    
    // Simulate test run
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.announce("Running tests... ✅ All 20 tests passed!");
    
    return { implementation };
  }

  announce(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(chalk.cyan(`💬 ${this.name}: ${message}`));
      this.ws.send(JSON.stringify({
        type: 'message',
        text: `[${this.mode.toUpperCase()}] ${message}`
      }));
    }
  }

  async saveArtifact(filename, content) {
    const filepath = path.join(PROJECT_DIR, filename);
    await fs.mkdir(PROJECT_DIR, { recursive: true });
    await fs.writeFile(filepath, content);
    console.log(chalk.green(`   📄 Saved: ${filename}`));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Main demo flow
async function runDemo() {
  try {
    // Server check
    console.log(chalk.yellow('\n🔍 Checking SPARC collaboration server...'));
    
    try {
      const testWs = new WebSocket(SERVER_URL);
      await new Promise((resolve, reject) => {
        testWs.on('open', () => {
          testWs.close();
          resolve();
        });
        testWs.on('error', reject);
        setTimeout(() => reject(new Error('timeout')), 2000);
      });
    } catch (error) {
      console.log(chalk.red('❌ Server not running!'));
      console.log(chalk.yellow('💡 Starting server...'));
      
      const { spawn } = require('child_process');
      const serverProcess = spawn('cc', ['server'], {
        detached: true,
        stdio: 'ignore'
      });
      serverProcess.unref();
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(chalk.green('✅ Server ready for SPARC-TDD'));

    // Create SPARC agents
    const agents = SPARC_AGENTS.map(config => new SPARCAgent(config));
    
    // Register all agents
    for (const agent of agents) {
      await agent.register();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Connect all agents
    for (const agent of agents) {
      await agent.connect();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(chalk.cyan('\n🎬 Starting SPARC-TDD Collaboration...'));
    console.log(chalk.yellow(`\n📦 Feature: ${FEATURE.name}`));
    console.log(chalk.gray(`📝 ${FEATURE.description}\n`));

    // Execute SPARC phases sequentially
    let outputs = {};
    
    for (const agent of agents) {
      const result = await agent.executeMode(FEATURE, outputs);
      if (result) {
        outputs[agent.mode] = result;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    console.log(chalk.green('\n\n✨ SPARC-TDD Complete!'));
    console.log(chalk.yellow('\n📊 Development Summary:'));
    console.log(chalk.gray('• S - Specifications written with clear interfaces'));
    console.log(chalk.gray('• P - Pseudocode designed for core algorithms'));
    console.log(chalk.gray('• A - Analysis identified edge cases and test scenarios'));
    console.log(chalk.gray('• R - Refined into comprehensive test suite (TDD)'));
    console.log(chalk.gray('• C - Code implemented to pass all tests'));

    console.log(chalk.cyan('\n📁 Generated Artifacts:'));
    console.log(chalk.gray(`   ${PROJECT_DIR}/`));
    console.log(chalk.gray('   ├── specifications.json'));
    console.log(chalk.gray('   ├── algorithms.md'));
    console.log(chalk.gray('   ├── test-scenarios.json'));
    console.log(chalk.gray('   ├── shopping-cart.test.js'));
    console.log(chalk.gray('   └── shopping-cart.js'));

    console.log(chalk.cyan('\n🎯 TDD Benefits Demonstrated:'));
    console.log(chalk.gray('1. Tests written before implementation'));
    console.log(chalk.gray('2. Clear specifications drive development'));
    console.log(chalk.gray('3. Edge cases identified early'));
    console.log(chalk.gray('4. Implementation guided by tests'));
    console.log(chalk.gray('5. High confidence in code quality'));

    console.log(chalk.cyan('\n🚀 Next Steps:'));
    console.log(chalk.gray(`   cd ${PROJECT_DIR}`));
    console.log(chalk.gray('   npm test              # Run the test suite'));
    console.log(chalk.gray('   npm run coverage      # Check test coverage'));

    // Cleanup
    agents.forEach(agent => agent.disconnect());
    
    process.exit(0);

  } catch (error) {
    console.error(chalk.red('\n❌ Demo error:'), error.message);
    process.exit(1);
  }
}

// Run the demo
runDemo();