// 实用的 React 代码审查示例 - 使用 Claude-Collab v3.4.0

const WebSocket = require('ws');

// 待审查的代码：一个有问题的 React 组件
const codeToReview = `
// UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function UserDashboard({ userId }) {
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  
  // 问题1: 多个串行 API 调用
  useEffect(() => {
    axios.get(\`/api/users/\${userId}\`)
      .then(res => {
        setUserData(res.data);
        return axios.get(\`/api/stats/\${userId}\`);
      })
      .then(res => {
        setStats(res.data);
        return axios.get(\`/api/activities/\${userId}\`);
      })
      .then(res => setActivities(res.data));
  }, [userId]);
  
  // 问题2: 没有处理加载和错误状态
  if (!userData) return null;
  
  return (
    <div>
      {/* 问题3: XSS 漏洞 */}
      <div dangerouslySetInnerHTML={{__html: userData.customHtml}} />
      
      {/* 问题4: 缺少 key */}
      {activities.map(activity => (
        <div>{activity.title}</div>
      ))}
      
      {/* 问题5: 内联样式性能问题 */}
      <div style={{backgroundColor: userData.theme?.color || '#fff'}}>
        <h1>{userData.name}</h1>
        <p>积分: {stats?.points}</p>
      </div>
    </div>
  );
}
`;

class CodeReviewSession {
  constructor() {
    this.experts = [
      {
        name: '安全专家-陈磊',
        role: 'security',
        perspective: 'SKEPTIC',
        analysis: {
          content: `严重安全问题：
1. XSS 漏洞 - dangerouslySetInnerHTML 直接渲染用户数据，必须先消毒
2. API 端点暴露用户 ID，建议使用 session 认证
3. 没有 CSRF 保护

修复建议：使用 DOMPurify.sanitize(userData.customHtml)`,
          evidence: { source: 'OWASP XSS Prevention Cheat Sheet', confidence: 'high' }
        }
      },
      {
        name: '性能专家-王芳',
        role: 'performance',
        perspective: 'ANALYTICAL',
        analysis: {
          content: `性能瓶颈：
1. 串行 API 调用浪费时间，应该用 Promise.all() 并行
2. 内联样式导致每次渲染都创建新对象
3. 缺少 React.memo 优化

优化后可减少 60% 加载时间`,
          evidence: { source: 'React Profiler 测试数据', confidence: 'high' }
        }
      },
      {
        name: 'UX专家-李娜',
        role: 'ux',
        perspective: 'PRAGMATIST', 
        analysis: {
          content: `用户体验问题：
1. 加载时显示空白，应该有骨架屏
2. 没有错误处理，网络失败时用户困惑
3. activities 列表应该分页或虚拟滚动

建议添加 loading、error、empty 三种状态`,
          evidence: { source: '用户测试反馈报告', confidence: 'medium' }
        }
      },
      {
        name: '架构师-张伟',
        role: 'architect',
        perspective: 'OPTIMIST',
        analysis: {
          content: `虽然有改进空间，但整体结构清晰。建议：
1. 抽取 useUserDashboard 自定义 Hook
2. 使用 React Query 管理服务端状态
3. 添加 ErrorBoundary 组件

这些改进能让代码更易维护和测试`,
          evidence: { source: 'Clean Code principles', confidence: 'medium' }
        }
      }
    ];
    
    this.sockets = new Map();
    this.messageCount = 0;
  }

  async start() {
    console.log('🚀 启动 Claude-Collab 实用代码审查\n');
    console.log('📝 待审查代码:');
    console.log(codeToReview);
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 连接所有专家
    for (const expert of this.experts) {
      await this.connectExpert(expert);
      await this.delay(500); // 避免连接风暴
    }
    
    // 等待所有专家注册完成
    await this.delay(2000);
    
    // 开始发送分析
    console.log('\n🔍 开始多角度分析...\n');
    for (const expert of this.experts) {
      await this.sendAnalysis(expert);
      await this.delay(2000); // 给时间显示响应
    }
    
    // 等待讨论
    await this.delay(5000);
    
    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('✅ 代码审查完成！');
    console.log('\n关键发现：');
    console.log('- 🔴 严重：XSS 安全漏洞需立即修复');
    console.log('- 🟡 重要：API 调用可优化 60%');
    console.log('- 🟢 建议：改善用户体验和代码结构');
    console.log('\n详细报告已保存到 .claude-collab/DISCUSSION_BOARD.md');
    
    // 清理
    this.cleanup();
  }

  connectExpert(expert) {
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://localhost:8765');
      
      ws.on('open', () => {
        // 注册专家
        ws.send(JSON.stringify({
          type: 'register',
          agentId: expert.name,
          role: expert.role
        }));
      });
      
      ws.on('message', (data) => {
        const msg = JSON.parse(data);
        
        if (msg.type === 'registered') {
          console.log(`✅ ${expert.name} 已连接`);
          this.sockets.set(expert.name, ws);
          resolve();
        }
        
        if (msg.type === 'notification' && msg.notification?.newMessage) {
          const message = msg.notification.newMessage;
          if (message.agentId === expert.name) {
            this.messageCount++;
            console.log(`\n💬 [${this.messageCount}] ${expert.name}:`);
            console.log(message.content);
            if (message.evidence) {
              console.log(`📊 依据: ${message.evidence.source}`);
            }
          }
        }
        
        if (msg.type === 'diversity_warning') {
          console.log(`⚠️  多样性提醒: ${msg.reason}`);
          console.log('   (在 PRACTICAL_MODE 下仍可继续)');
        }
      });
      
      ws.on('error', (err) => {
        console.error(`❌ ${expert.name} 连接错误:`, err.message);
      });
    });
  }

  async sendAnalysis(expert) {
    const ws = this.sockets.get(expert.name);
    if (!ws) return;
    
    ws.send(JSON.stringify({
      type: 'message',
      content: expert.analysis.content,
      evidence: expert.analysis.evidence
    }));
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cleanup() {
    for (const [name, ws] of this.sockets) {
      ws.close();
    }
    process.exit(0);
  }
}

// 检查服务器是否运行
const testWs = new WebSocket('ws://localhost:8765');
testWs.on('error', () => {
  console.error('❌ Claude-Collab 服务器未运行');
  console.log('请先运行: PRACTICAL_MODE=true npm start');
  process.exit(1);
});

testWs.on('open', () => {
  testWs.close();
  // 服务器运行中，开始审查
  const session = new CodeReviewSession();
  session.start();
});