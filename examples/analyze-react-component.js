// 实际使用案例：分析一个 React 组件的性能和安全性

const WebSocket = require('ws');

// 要分析的代码
const codeToReview = `
// UserProfile.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  
  useEffect(() => {
    // 获取用户数据
    axios.get(\`/api/users/\${userId}\`)
      .then(res => setUser(res.data));
    
    // 获取用户帖子
    axios.get(\`/api/posts?user=\${userId}\`)
      .then(res => setPosts(res.data));
  }, [userId]);
  
  return (
    <div className="profile">
      <h1>{user?.name}</h1>
      <div dangerouslySetInnerHTML={{__html: user?.bio}} />
      <div className="posts">
        {posts.map(post => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
`;

// 创建不同专家角色
const experts = [
  {
    name: '张安全-security',
    role: 'security-expert',
    focus: '安全漏洞和最佳实践'
  },
  {
    name: '李性能-performance', 
    role: 'performance-expert',
    focus: '性能优化和渲染效率'
  },
  {
    name: '王架构-architecture',
    role: 'architecture-expert', 
    focus: '代码结构和可维护性'
  },
  {
    name: '赵体验-ux',
    role: 'ux-expert',
    focus: '用户体验和错误处理'
  }
];

async function analyzeCode() {
  const sockets = [];
  
  console.log('🚀 开始多角度代码分析...\n');
  console.log('代码内容：', codeToReview);
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 连接所有专家
  for (const expert of experts) {
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
        console.log(`✅ ${expert.name} (${expert.focus}) 已就位`);
        
        // 发送分析请求
        setTimeout(() => {
          const analysis = getExpertAnalysis(expert, codeToReview);
          ws.send(JSON.stringify({
            type: 'message',
            content: analysis.content,
            evidence: analysis.evidence
          }));
        }, 1000 * experts.indexOf(expert));
      }
      
      if (msg.type === 'notification' && msg.notification?.newMessage) {
        const message = msg.notification.newMessage;
        if (message.agentId === expert.name) {
          console.log(`\n💬 ${expert.name} 的分析：`);
          console.log(message.content);
          if (message.evidence) {
            console.log(`📊 依据: ${message.evidence.source}`);
          }
        }
      }
      
      if (msg.type === 'diversity_warning') {
        console.log(`\n⚠️  多样性提醒 (${expert.name}): ${msg.reason}`);
      }
    });
    
    sockets.push(ws);
  }
  
  // 10秒后关闭连接
  setTimeout(() => {
    console.log('\n分析完成！查看 .claude-collab/DISCUSSION_BOARD.md 获取完整报告');
    sockets.forEach(ws => ws.close());
  }, 10000);
}

function getExpertAnalysis(expert, code) {
  const analyses = {
    '张安全-security': {
      content: '发现严重安全漏洞：dangerouslySetInnerHTML 直接渲染用户输入的 bio，存在 XSS 攻击风险。建议使用 DOMPurify 或其他消毒库处理 HTML。另外，API 调用缺少错误处理。',
      evidence: { source: 'OWASP Top 10 - Cross Site Scripting', confidence: 'high' }
    },
    '李性能-performance': {
      content: '性能问题：两个独立的 API 调用可以并行执行。使用 Promise.all() 优化。另外缺少 loading 状态，会导致布局抖动。建议添加加载骨架屏。',
      evidence: { source: 'React Performance Best Practices', confidence: 'high' }
    },
    '王架构-architecture': {
      content: '架构改进：建议抽取自定义 Hook (useUserProfile) 来处理数据获取逻辑。这样可以复用和测试。另外应该添加错误边界组件。',
      evidence: { source: 'React Patterns - Custom Hooks', confidence: 'medium' }
    },
    '赵体验-ux': {
      content: '用户体验缺陷：没有加载状态、错误状态和空状态处理。用户会看到空白页面。建议添加 Suspense 和错误提示，提升感知性能。',
      evidence: { source: 'Nielsen Norman Group - Loading Indicators', confidence: 'high' }
    }
  };
  
  return analyses[expert.name] || {
    content: '正在分析中...',
    evidence: { source: 'general analysis', confidence: 'medium' }
  };
}

// 运行分析
analyzeCode();