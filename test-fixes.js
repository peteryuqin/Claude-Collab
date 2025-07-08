// Comprehensive test for Claude-Collab v3.4.1 fixes
const WebSocket = require('ws');
const { spawn } = require('child_process');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testConnectionHelper() {
  console.log('\n📋 Test 1: Connection Helper (WebSocket Direct)');
  
  const { CLIConnectionHelper } = require('./cli/connection-helper');
  const helper = new CLIConnectionHelper('ws://localhost:8765');
  
  try {
    await helper.connect();
    console.log('✅ Connection helper works without ConnectionManager');
    helper.disconnect();
  } catch (error) {
    console.error('❌ Connection helper failed:', error.message);
    return false;
  }
  
  return true;
}

async function testRegistrationFlow() {
  console.log('\n📋 Test 2: Registration and Authentication Flow');
  
  const ws = new WebSocket('ws://localhost:8765');
  
  return new Promise((resolve) => {
    let authToken = null;
    
    ws.on('open', () => {
      console.log('✅ Connected to server');
      // Test registration with correct fields
      ws.send(JSON.stringify({
        type: 'register',
        agentName: 'test-agent-' + Date.now(),
        role: 'tester'
      }));
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      
      if (msg.type === 'register-success') {
        console.log('✅ Registration successful');
        console.log(`   Agent ID: ${msg.agentId}`);
        authToken = msg.authToken;
        ws.close();
        
        // Test authentication
        const ws2 = new WebSocket('ws://localhost:8765');
        ws2.on('open', () => {
          ws2.send(JSON.stringify({
            type: 'auth',
            agentName: msg.agentName,
            authToken: authToken,
            role: msg.role
          }));
        });
        
        ws2.on('message', (data2) => {
          const msg2 = JSON.parse(data2);
          if (msg2.type === 'auth-success') {
            console.log('✅ Authentication successful');
            ws2.close();
            resolve(true);
          }
        });
      } else if (msg.type === 'register-failed') {
        console.error('❌ Registration failed:', msg.reason);
        ws.close();
        resolve(false);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      resolve(false);
    });
  });
}

async function testSwarmWithQuotes() {
  console.log('\n📋 Test 3: Swarm with Quotes in Objective');
  
  const objective = `Analyze this SQL: SELECT * FROM users WHERE id = '123'`;
  console.log(`   Objective: ${objective}`);
  
  // Start swarm with quotes in objective
  const swarmProcess = spawn('node', [
    './bin/cc',
    'swarm',
    objective,
    '--max-agents', '2',
    '--strategy', 'review'
  ], {
    cwd: '/Users/peter/Claude-Collab'
  });
  
  return new Promise((resolve) => {
    let output = '';
    let errorOutput = '';
    
    swarmProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    swarmProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    swarmProcess.on('close', (code) => {
      if (code === 0 && !errorOutput.includes('SyntaxError')) {
        console.log('✅ Swarm handled quotes correctly');
        resolve(true);
      } else {
        console.error('❌ Swarm failed with quotes');
        console.error('Error output:', errorOutput);
        resolve(false);
      }
    });
    
    // Kill swarm after 5 seconds
    setTimeout(() => {
      swarmProcess.kill();
    }, 5000);
  });
}

async function testJSONRecovery() {
  console.log('\n📋 Test 4: Identity JSON Recovery');
  
  const fs = require('fs');
  const path = require('path');
  
  // Create a corrupted identities.json
  const identitiesPath = path.join('/Users/peter/Claude-Collab/.claude-collab/identities.json');
  const backupPath = identitiesPath + '.backup';
  
  // Save current file as backup
  if (fs.existsSync(identitiesPath)) {
    fs.copyFileSync(identitiesPath, backupPath);
  }
  
  // Write corrupted JSON
  fs.writeFileSync(identitiesPath, '{"identities": [{"invalid": json}]}');
  
  // Restart server to test recovery
  console.log('   Testing recovery from corrupted JSON...');
  
  // Import identity manager
  const { IdentityManager } = require('./dist/core/identity-manager');
  const manager = new IdentityManager('/Users/peter/Claude-Collab/.claude-collab');
  
  // Check if it recovered
  if (fs.existsSync(identitiesPath)) {
    try {
      const data = fs.readFileSync(identitiesPath, 'utf-8');
      JSON.parse(data); // Should not throw if recovered
      console.log('✅ JSON recovery mechanism works');
      return true;
    } catch (error) {
      console.error('❌ JSON recovery failed');
      return false;
    }
  }
  
  return false;
}

async function runAllTests() {
  console.log('🧪 Claude-Collab v3.4.1 Fix Verification');
  console.log('=====================================');
  
  // Check if server is running
  const testWs = new WebSocket('ws://localhost:8765');
  
  testWs.on('error', () => {
    console.error('❌ Server not running!');
    console.log('Please start server with: PRACTICAL_MODE=true npm start');
    process.exit(1);
  });
  
  testWs.on('open', async () => {
    testWs.close();
    
    const results = [];
    
    // Run all tests
    results.push(await testConnectionHelper());
    await delay(1000);
    
    results.push(await testRegistrationFlow());
    await delay(1000);
    
    results.push(await testSwarmWithQuotes());
    await delay(1000);
    
    results.push(await testJSONRecovery());
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('================');
    const passed = results.filter(r => r === true).length;
    const total = results.length;
    console.log(`Passed: ${passed}/${total}`);
    
    if (passed === total) {
      console.log('\n✅ All fixes verified! Claude-Collab v3.4.1 is ready.');
    } else {
      console.log('\n❌ Some tests failed. Please check the output above.');
    }
    
    process.exit(passed === total ? 0 : 1);
  });
}

// Run tests
runAllTests();