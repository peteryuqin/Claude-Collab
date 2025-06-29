# Claude-Collab TDD with SPARC Mode Demo

This example showcases Test-Driven Development (TDD) using Claude-Collab's SPARC methodology, where specialized agents collaborate through each phase of development.

## What is SPARC?

SPARC is a structured development methodology:
- **S**pecify: Define clear requirements and interfaces
- **P**seudocode: Design algorithms and data structures
- **A**nalyze: Identify edge cases and test scenarios
- **R**efine: Write tests before implementation (TDD)
- **C**ode: Implement to pass all tests

## What it Shows

- **SPARC Methodology**: Sequential phases with specialized agents
- **Test-Driven Development**: Tests written before implementation
- **Collaborative Design**: Each agent builds on previous work
- **Complete Feature**: Shopping cart with discount system
- **Quality Focus**: Comprehensive testing and edge case handling

## The SPARC Team

1. **SPARC-Specify**: Requirements analyst defining specifications
2. **SPARC-Pseudocode**: System designer creating algorithms
3. **SPARC-Analyze**: QA engineer identifying test scenarios
4. **SPARC-Refine**: TDD developer writing test suite
5. **SPARC-Code**: Implementation developer coding solution

## Feature Built: Shopping Cart

A complete e-commerce shopping cart with:
- Item management (add, remove, update)
- Multiple discount types (percentage, fixed, bulk)
- Tax calculations
- Discount stacking and limits
- Comprehensive error handling

## Running the Demo

```bash
node sparc-tdd-demo.js
```

The demo will:
1. Initialize SPARC agents with specific roles
2. Execute each SPARC phase sequentially
3. Generate working code with full test coverage
4. Create project artifacts in `shopping-cart-tdd/`

## Generated Project Structure

```
shopping-cart-tdd/
├── specifications.json    # Requirements and interfaces
├── algorithms.md         # Pseudocode and logic design
├── test-scenarios.json   # Edge cases and test plans
├── shopping-cart.test.js # Complete test suite (TDD)
└── shopping-cart.js      # Implementation passing all tests
```

## SPARC Phase Details

### 1. Specify Phase
```json
{
  "interfaces": [
    "ShoppingCart class with methods",
    "CartItem interface",
    "Discount interface"
  ],
  "acceptanceCriteria": [
    "Cart total updates correctly",
    "Tax calculated properly",
    "Discounts apply correctly"
  ]
}
```

### 2. Pseudocode Phase
Designs core algorithms:
- Cart data structure using Map
- Discount calculation logic
- Tax computation after discounts

### 3. Analyze Phase
Identifies critical scenarios:
- Empty cart edge cases
- Discount stacking issues
- Concurrent access problems
- Integer overflow risks

### 4. Refine Phase (TDD)
Writes comprehensive tests:
```javascript
describe('ShoppingCart', () => {
  test('new cart should be empty', () => {
    expect(cart.getItemCount()).toBe(0);
  });
  
  test('should apply percentage discount', () => {
    cart.applyDiscount({ type: 'percentage', value: 10 });
    expect(cart.getTotal()).toBe(4860);
  });
});
```

### 5. Code Phase
Implements to pass all tests:
- Clean, modular code
- Proper validation
- Edge case handling
- Performance optimized

## TDD Benefits Demonstrated

1. **Requirements-Driven**: Tests based on clear specifications
2. **Design-First**: Algorithm planning before coding
3. **Edge Case Coverage**: Identified early, tested thoroughly
4. **Confidence**: All code paths tested
5. **Documentation**: Tests serve as living documentation

## Running the Generated Code

After the demo completes:

```bash
cd shopping-cart-tdd
npm init -y
npm install --save-dev jest
npm test
```

Expected output:
```
PASS  ./shopping-cart.test.js
  ShoppingCart
    ✓ Basic Operations (5 tests)
    ✓ Discount Calculations (5 tests)
    ✓ Tax Calculations (3 tests)
    ✓ Error Handling (4 tests)

Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
```

## Customization Ideas

- Add more SPARC agents for documentation, security review
- Implement different features (user authentication, payment processing)
- Create industry-specific SPARC workflows
- Add performance benchmarking phase
- Integrate with CI/CD pipelines

## Real-World Applications

1. **API Development**: SPARC-driven REST API design
2. **Microservices**: Test-first service development
3. **Library Creation**: Public API design with TDD
4. **Refactoring**: Safe code modernization
5. **Feature Development**: Structured feature implementation

## Why SPARC + TDD?

Traditional development often suffers from:
- Unclear requirements leading to rework
- Missing edge cases found in production
- Poor test coverage added after coding
- Design decisions made during implementation

SPARC + TDD solves these by:
- Clear phases with specific outputs
- Early identification of complexities
- Tests driving implementation
- Collaborative refinement at each stage

This demo proves that AI agents can follow sophisticated development methodologies, producing high-quality, well-tested code through structured collaboration.