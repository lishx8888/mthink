# Docker部署与本地Nginx反向代理配置

## 概述

本项目已配置Docker环境，支持通过Docker镜像部署应用，并使用本地已安装的Nginx实现反向代理，通过`IP/mthink/`路径访问应用。配置已简化为与openlist项目相似的格式。

## 配置文件说明

### 1. Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
EXPOSE 8000
CMD ["node", "server.js"]
```

- 使用轻量级的Node.js 18 Alpine镜像
- 将项目文件复制到容器的`/app`目录
- 暴露容器的8000端口
- 启动Node.js服务器

### 2. docker-compose.yml

```yaml
version: '3'

services:
  app:
    build: .
    container_name: mthink
    ports:
      - "8000:8000"
    restart: unless-stopped
    networks:
      - mindmap_network

networks:
  mindmap_network:
    driver: bridge
```

- 仅配置应用服务，不再包含Nginx服务
- 将容器的8000端口映射到主机的8000端口
- 容器自动重启机制

### 3. 本地Nginx配置示例

```nginx
# 思维导图应用的Nginx反向代理配置
# 适用于已经安装了本地Nginx的情况
# 配置格式与openlist项目保持一致

# 将此配置添加到/etc/nginx/nginx.conf或/etc/nginx/conf.d/目录下

location /mthink/ {
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Range $http_range;
    proxy_set_header If-Range $http_if_range;
    proxy_redirect off;
    proxy_pass http://127.0.0.1:8000/;
    # the max size of file to upload
    client_max_body_size 20000m;
}
```

- 配置本地Nginx的反向代理规则
- 将`/mthink/`路径的请求转发到`http://127.0.0.1:8000/`
- 包含完整的代理头信息配置
- 支持文件分块下载（Range和If-Range）
- 允许上传最大20GB的文件
- **与openlist项目配置格式完全一致**，无需额外的静态资源配置

## 部署步骤

### 1. 构建Docker镜像

在项目根目录执行以下命令：

```bash
docker-compose build
```

### 2. 运行Docker容器

```bash
docker-compose up -d
```

- `-d`参数表示在后台运行容器

### 3. 配置本地Nginx

#### 3.1 复制配置文件

将上述Nginx配置内容添加到本地Nginx的配置文件中。

#### 3.2 常见配置文件位置

- Ubuntu/Debian: `/etc/nginx/nginx.conf` 或 `/etc/nginx/conf.d/` 目录
- CentOS/RHEL: `/etc/nginx/nginx.conf` 或 `/etc/nginx/conf.d/` 目录
- Windows: 取决于Nginx的安装位置，通常在 `conf/nginx.conf`

#### 3.3 验证配置

```bash
nginx -t
```

- 如果配置正确，会显示：
  ```
  nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
  nginx: configuration file /etc/nginx/nginx.conf test is successful
  ```

### 4. 重启Nginx

```bash
# Ubuntu/Debian
sudo systemctl restart nginx

# CentOS/RHEL
sudo systemctl restart nginx

# Windows (命令行)
nginx -s reload
```

## 访问应用

部署完成后，可以通过以下方式访问应用：

1. **直接访问Docker容器**：
   ```
   http://IP:8000
   ```

2. **通过本地Nginx反向代理**：
   ```
   http://IP/mthink/
   ```

## 配置说明

### 为什么不需要单独配置静态资源？

与openlist项目一样，本项目也不需要单独配置静态资源，原因如下：

1. **Path Matching Priority**：
   - 当请求进入Nginx时，会首先匹配最具体的location规则
   - 对于 `/mthink/image.png` 这样的请求，会直接匹配 `location /mthink/` 规则

2. **URL Prefix Removal**：
   - 通过 `proxy_pass http://127.0.0.1:8000/;`（注意末尾的斜杠）
   - Nginx会自动移除 `/mthink/` 前缀后将请求转发到后端
   - 例如：`http://IP/mthink/image.png` → 转发到 `http://127.0.0.1:8000/image.png`

3. **Application Handling**：
   - 应用本身可以处理静态资源请求
   - 不需要Nginx额外的静态资源配置

### 与openlist项目的配置对比

| 配置项 | openlist项目 | 思维导图项目 |
|-------|-------------|------------|
| 路径 | `/openlist/` | `/mthink/` |
| 代理地址 | `http://127.0.0.1:5244` | `http://127.0.0.1:8000/` |
| 代理头设置 | 完整 | 完整 |
| 文件上传限制 | 20GB | 20GB |
| 静态资源处理 | 自动处理 | 自动处理 |
| 配置复杂度 | 简洁 | 同样简洁 |

## 注意事项

1. **端口冲突**：
   - 确保主机的8000端口未被其他服务占用
   - 如果需要使用其他端口，可以修改`docker-compose.yml`中的端口映射，例如：`"8080:8000"`
   - 同时需要更新本地Nginx配置中的`proxy_pass`地址

2. **路径配置**：
   - 所有资源引用已使用相对路径，确保在反向代理环境下正常工作
   - 反向代理路径已配置为`/mthink/`（带斜杠）

3. **Nginx权限**：
   - 确保Nginx配置文件的权限正确
   - 确保Nginx用户有权限访问相关资源

4. **防火墙设置**：
   - 如果使用了防火墙，确保80端口（Nginx）和8000端口（Docker应用）已开放

## 故障排查

### 检查Docker容器状态

```bash
docker-compose ps
```

### 查看Docker容器日志

```bash
docker-compose logs -f app
```

### 检查Nginx状态

```bash
# Ubuntu/Debian
sudo systemctl status nginx

# CentOS/RHEL
sudo systemctl status nginx
```

### 检查Nginx日志

```bash
# Ubuntu/Debian
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# CentOS/RHEL
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 更新应用

1. 修改代码后，重新构建镜像：
   ```bash
docker-compose build
   ```

2. 重启容器：
   ```bash
docker-compose down
docker-compose up -d
   ```

## 总结

本配置实现了：
1. 使用Docker容器化部署思维导图应用
2. 通过本地已安装的Nginx实现反向代理`IP/mthink/`路径访问
3. **与openlist项目完全一致的配置格式**
4. 自动处理静态资源，无需额外配置
5. 支持大文件上传和分块下载
6. 简洁高效的配置，易于维护

应用现在可以通过两种方式访问：
- **直接访问**：`http://IP:8000`
- **反向代理访问**：`http://IP/mthink/`