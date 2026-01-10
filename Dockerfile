# 使用Node.js作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制项目文件
COPY . .

# 暴露端口
EXPOSE 8000

# 启动服务器
CMD ["node", "server.js"]