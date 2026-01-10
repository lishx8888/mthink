# 使用Nginx作为基础镜像（比Node.js更轻量级）
FROM nginx:alpine

# 复制项目文件到Nginx的静态文件目录
COPY index.html /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/

# 暴露端口
EXPOSE 80

# Nginx默认会自动启动
