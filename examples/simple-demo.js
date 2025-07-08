// 简单的 Claude-Collab 演示
const WebSocket = require('ws');

async function runDemo() {
  console.log('🚀 Claude-Collab 简单演示\n');
  
  // 创建安全专家连接
  const securityExpert = new WebSocket('ws://localhost:8765');
  
  securityExpert.on('open', () => {
    console.log('连接成功！');
    
    // 注册
    securityExpert.send(JSON.stringify({
      type: 'register',
      agentName: '安全专家',
      role: 'security'
    }));
  });
  
  securityExpert.on('message', (data) => {
    const msg = JSON.parse(data);
    console.log('收到消息:', msg.type);
    
    if (msg.type === 'register-success') {
      console.log('✅ 注册成功！');
      console.log(`   Agent ID: ${msg.agentId}`);
      console.log(`   Auth Token 已保存`);
      
      // 关闭连接，准备重新连接并认证
      securityExpert.close();
      
      // 重新连接并使用认证
      setTimeout(() => {
        const authConnection = new WebSocket('ws://localhost:8765');
        
        authConnection.on('open', () => {
          console.log('\n重新连接，使用认证...');
          authConnection.send(JSON.stringify({
            type: 'auth',
            agentName: msg.agentName,
            authToken: msg.authToken,
            role: msg.role
          }));
        });
        
        authConnection.on('message', (data2) => {
          const msg2 = JSON.parse(data2);
          
          if (msg2.type === 'auth-success') {
            console.log('✅ 认证成功！发送分析...\n');
            
            // 发送消息
            authConnection.send(JSON.stringify({
              type: 'message',
              text: '发现 XSS 漏洞：dangerouslySetInnerHTML 使用了未经处理的用户输入',
              evidence: {
                source: 'OWASP Security Guidelines',
                confidence: 'high'
              }
            }));
          }
        });
      }, 1000);
    }
    
    if (msg.type === 'notification') {
      console.log('📨 通知:', msg.notification);
    }
    
    if (msg.type === 'diversity_warning') {
      console.log('⚠️  多样性警告:', msg.reason);
      console.log('(在 PRACTICAL_MODE 下消息仍然发送)\n');
    }
  });
  
  // 5秒后关闭
  setTimeout(() => {
    console.log('演示结束！');
    securityExpert.close();
    process.exit(0);
  }, 5000);
}

runDemo();