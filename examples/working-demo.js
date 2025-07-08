// Claude-Collab v3.4.0 实用演示
const WebSocket = require('ws');

class ClaudeCollabDemo {
  constructor() {
    this.agents = [
      {
        id: 'security-zhang',
        name: '张安全',
        role: 'security-expert',
        message: '发现严重安全漏洞：用户输入未经验证直接用于 SQL 查询，存在注入风险。建议使用参数化查询。',
        evidence: { source: 'OWASP SQL Injection Prevention', confidence: 'high' }
      },
      {
        id: 'performance-li', 
        name: '李性能',
        role: 'performance-expert',
        message: '性能分析：这个查询没有使用索引，在大数据量下会很慢。建议添加复合索引 (user_id, created_at)。',
        evidence: { source: 'Database Performance Tuning Guide', confidence: 'medium' }
      }
    ];
  }

  async start() {
    console.log('🚀 启动 Claude-Collab v3.4.0 实用演示');
    console.log('📝 场景：分析一段有问题的数据库查询代码\n');
    
    for (const agent of this.agents) {
      await this.connectAgent(agent);
      await this.delay(3000);
    }
    
    console.log('\n✅ 演示完成！');
    console.log('💡 关键发现：');
    console.log('  - 安全问题需要立即修复');
    console.log('  - 性能优化可以提升查询速度');
    console.log('\n查看 .claude-collab/DISCUSSION_BOARD.md 了解完整讨论');
    
    process.exit(0);
  }

  connectAgent(agent) {
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:8765');
      let registered = false;
      
      ws.on('open', () => {
        console.log(`\n🔌 ${agent.name} 连接中...`);
        // 立即发送注册消息
        ws.send(JSON.stringify({
          type: 'register',
          agentName: agent.name,
          role: agent.role
        }));
      });
      
      ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data);
          
          // 处理各种消息类型
          switch(msg.type) {
            case 'register-success':
              if (!registered) {
                registered = true;
                console.log(`✅ ${agent.name} 注册成功`);
                console.log(`   需要重新连接并认证...`);
                
                // 保存认证信息
                const authInfo = {
                  agentName: msg.agentName,
                  authToken: msg.authToken,
                  role: msg.role
                };
                
                // 关闭当前连接
                ws.close();
                
                // 重新连接并认证
                setTimeout(async () => {
                  const authWs = new WebSocket('ws://localhost:8765');
                  
                  authWs.on('open', () => {
                    authWs.send(JSON.stringify({
                      type: 'auth',
                      ...authInfo
                    }));
                  });
                  
                  authWs.on('message', async (authData) => {
                    const authMsg = JSON.parse(authData);
                    
                    if (authMsg.type === 'auth-success') {
                      console.log(`✅ ${agent.name} 认证成功，发送分析...`);
                      
                      // 发送分析消息
                      authWs.send(JSON.stringify({
                        type: 'message',
                        text: agent.message,
                        evidence: agent.evidence
                      }));
                      
                      // 等待处理后关闭
                      await this.delay(2000);
                      authWs.close();
                      resolve();
                    }
                  });
                }, 1000);
              }
              break;
              
            case 'error':
              console.log(`❌ ${agent.name} 错误:`, msg.error);
              break;
              
            case 'notification':
              if (msg.notification?.newMessage?.agentId === agent.id) {
                console.log(`💬 ${agent.name}: ${agent.message.substring(0, 50)}...`);
              }
              break;
              
            case 'diversity_warning':
              console.log(`⚠️  多样性提醒: ${msg.reason}`);
              console.log(`   (PRACTICAL_MODE 下仍可继续)`);
              break;
              
          }
        } catch (e) {
          console.error('解析消息错误:', e);
        }
      });
      
      ws.on('error', (err) => {
        console.error(`❌ ${agent.name} 连接错误:`, err.message);
        resolve();
      });
      
      ws.on('close', () => {
        console.log(`👋 ${agent.name} 已断开`);
      });
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 检查服务器
const testWs = new WebSocket('ws://localhost:8765');
testWs.on('error', () => {
  console.error('❌ 服务器未运行！');
  console.log('请先运行: PRACTICAL_MODE=true npm start');
  process.exit(1);
});

testWs.on('open', () => {
  testWs.close();
  const demo = new ClaudeCollabDemo();
  demo.start();
});