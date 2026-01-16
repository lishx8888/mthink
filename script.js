// 节点类
class Node {
    constructor(id, text, x, y, parents = []) {
        this.id = id;
        this.text = text;
        this.x = x;
        this.y = y;
        this.parents = Array.isArray(parents) ? parents : [parents].filter(p => p !== null);
        this.children = [];
        this.isReverseConnection = false;
        this.style = {
            nodeColor: '#ffffff',
            borderColor: '#000000',
            fontColor: '#000000',
            fontSize: 14,
            fontFamily: 'Arial'
        };
        this.width = 0;
        this.height = 0;
    }
    
    addChild(childNode) {
        this.children.push(childNode);
        if (!childNode.parents.includes(this)) {
            childNode.parents.push(this);
        }
    }
    
    removeChild(childNode) {
        const index = this.children.indexOf(childNode);
        if (index !== -1) {
            this.children.splice(index, 1);
            // 从子节点的父节点列表中移除当前节点
            const parentIndex = childNode.parents.indexOf(this);
            if (parentIndex !== -1) {
                childNode.parents.splice(parentIndex, 1);
            }
        }
    }
    

    
    updatePosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    // 获取节点的边界信息
    getNodeBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2,
            centerX: this.x,
            centerY: this.y
        };
    }

    updateStyle(newStyle) {
        this.style = { ...this.style, ...newStyle };
    }
}

// 思维导图类
class MindMap {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.selectedNodes = []; // 存储多个选中的节点
        this.nextNodeId = 1;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragNode = null;
        // 对齐和间距提示
        this.alignmentGuides = [];
        this.spacingGuides = [];
        
        // 框选相关属性
        this.isSelecting = false;
        this.selectionStartX = 0;
        this.selectionStartY = 0;
        this.selectionEndX = 0;
        this.selectionEndY = 0;
        this.selectionRect = null;
        this.justFinishedSelection = false; // 防止click事件取消框选
        
        // 操作历史记录
        this.history = [];
        this.historyIndex = -1;
        this.historyLimit = 50; // 最大历史记录数量
        
        // 画布平移相关属性
        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.isCtrlPressed = false;
        
        // 编辑状态跟踪
        this.isEditingNode = false;
        this.currentEditingNode = null;
        
        // 连接线和箭头的统一颜色
        this.connectionColor = '#000000'; // 默认黑色
        
        // 缩略图相关属性
        this.thumbnailCanvas = document.getElementById('thumbnailCanvas');
        this.thumbnailScale = 0.1; // 固定缩放比例
        this.thumbnailWidth = 0;
        this.thumbnailHeight = 0;
        
        // 创建根节点 - 根据屏幕尺寸设置不同的默认位置
        const isMobile = window.innerWidth <= 768;
        const defaultX = isMobile ? 200 : 400;
        const defaultY = isMobile ? 150 : 100;
        this.rootNode = this.createNode('', defaultX, defaultY);
        
        // 保存初始状态
        this.saveState();
        
        // 预先绑定事件处理函数
        this.selectionMove = this.selectionMove.bind(this);
        this.stopSelection = this.stopSelection.bind(this);
        this.startSelection = this.startSelection.bind(this);
        this.drag = this.drag.bind(this);
        this.stopDrag = this.stopDrag.bind(this);
        this.touchDrag = this.touchDrag.bind(this);
        this.stopTouchDrag = this.stopTouchDrag.bind(this);
        
        this.initEventListeners();
        this.initThumbnail();
        this.initMobileLayout();
        this.render();
    }
    
    // 初始化手机布局处理
    initMobileLayout() {
        // 检测是否为移动设备
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (this.isMobile) {
            // 动态添加手机端的画布控制按钮
            this.addMobileControls();
            
            // 监听窗口大小变化（键盘弹出/收起）
            window.addEventListener('resize', () => {
                this.adjustLayoutForKeyboard();
            });
            
            // 监听输入框焦点事件（键盘弹出）
            document.addEventListener('focusin', (e) => {
                if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
                    this.keyboardVisible = true;
                    setTimeout(() => {
                        this.adjustLayoutForKeyboard();
                    }, 100);
                }
            });
            
            // 监听输入框失焦事件（键盘收起）
            document.addEventListener('focusout', () => {
                setTimeout(() => {
                    this.keyboardVisible = false;
                    this.adjustLayoutForKeyboard();
                }, 100);
            });
        }
    }
    
    // 添加手机端的画布控制按钮
    addMobileControls() {
        const canvasContainer = document.querySelector('.canvas-container');
        if (!canvasContainer) return;
        
        // 检查是否已经存在控制按钮
        if (document.querySelector('.canvas-controls')) return;
        
        // 创建画布控制按钮容器
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'canvas-controls';
        
        // 创建保存按钮
        const saveBtn = document.createElement('button');
        saveBtn.id = 'mobileSaveMap';
        saveBtn.className = 'panel-button';
        saveBtn.textContent = '保存';
        saveBtn.addEventListener('click', () => {
            document.getElementById('saveMap').click();
        });
        
        // 创建加载按钮
        const loadBtn = document.createElement('button');
        loadBtn.id = 'mobileLoadMap';
        loadBtn.className = 'panel-button';
        loadBtn.textContent = '加载';
        loadBtn.addEventListener('click', () => {
            document.getElementById('loadMap').click();
        });
        
        // 添加按钮到容器
        controlsContainer.appendChild(saveBtn);
        controlsContainer.appendChild(loadBtn);
        
        // 将控制按钮添加到画布容器顶部
        canvasContainer.insertBefore(controlsContainer, canvasContainer.firstChild);
    }
    
    // 调整布局以适应键盘
    adjustLayoutForKeyboard() {
        if (!this.isMobile) return;
        
        const mainArea = document.querySelector('.main-area');
        const canvasContainer = document.querySelector('.canvas-container');
        const stylePanel = document.querySelector('.style-panel');
        
        if (!mainArea || !canvasContainer || !stylePanel) return;
        
        const windowHeight = window.innerHeight;
        const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        
        // 判断键盘是否可见（窗口高度减少超过20%）
        const keyboardVisible = windowHeight - viewportHeight > windowHeight * 0.2;
        
        if (keyboardVisible) {
            // 键盘可见时，调整画布和样式面板高度
            const keyboardHeight = windowHeight - viewportHeight;
            const availableHeight = viewportHeight;
            
            // 画布占大部分空间
            canvasContainer.style.height = `${availableHeight * 0.7}px`;
            // 样式面板占剩余空间
            stylePanel.style.height = `${availableHeight * 0.3}px`;
        } else {
            // 键盘不可见时，恢复默认布局
            canvasContainer.style.height = '';
            stylePanel.style.height = '';
        }
    }
    
    createNode(text, x, y, parents = [], skipSaveState = false) {
        const node = new Node(this.nextNodeId++, text, x, y, parents);
        this.nodes.push(node);
        
        const parentsArray = Array.isArray(parents) ? parents : [parents].filter(p => p !== null);
        parentsArray.forEach(parent => {
            if (parent && !parent.children.includes(node)) {
                parent.addChild(node);
            }
        });
        
        // 保存状态
        if (!skipSaveState) {
            this.saveState();
        }
        
        return node;
    }
    
    // 保存当前状态到历史记录
    saveState() {
        // 如果已经在历史记录的中间位置，删除之后的历史记录
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // 保存节点信息和其他关键状态
        const state = {
            nodes: this.nodes.map(node => ({
                id: node.id,
                text: node.text,
                x: node.x,
                y: node.y,
                style: { ...node.style },
                parentIds: node.parents.map(parent => parent.id),
                childIds: node.children.map(child => child.id)
            })),
            nextNodeId: this.nextNodeId,
            rootNodeId: this.rootNode ? this.rootNode.id : null,
            // 保存选中状态
            selectedNodeId: this.selectedNode ? this.selectedNode.id : null,
            selectedNodeIds: this.selectedNodes.map(node => node.id)
        };
        
        // 检查新状态是否与当前状态相同，如果相同则不保存
        if (this.historyIndex >= 0) {
            const currentState = this.history[this.historyIndex];
            // 使用JSON.stringify比较状态是否相同
            const statesAreEqual = JSON.stringify(state) === JSON.stringify(currentState);
            if (statesAreEqual) {
                return; // 状态相同，不保存
            }
        }
        
        // 添加到历史记录
        this.history.push(state);
        this.historyIndex = this.history.length - 1;
        
        // 如果历史记录超过限制，删除最旧的记录
        if (this.history.length > this.historyLimit) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.loadState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.loadState(this.history[this.historyIndex]);
        }
    }

    loadState(state) {
        // 清空当前节点
        this.nodes = [];
        this.selectedNode = null;
        this.selectedNodes = [];
        
        // 创建新节点
        const nodeMap = new Map();
        
        // 先创建所有节点
        state.nodes.forEach(nodeData => {
            const node = new Node(
                nodeData.id,
                nodeData.text,
                nodeData.x,
                nodeData.y,
                []
            );
            // 设置样式
            node.style = nodeData.style;
            this.nodes.push(node);
            nodeMap.set(node.id, node);
        });
        
        // 建立父子关系
        state.nodes.forEach(nodeData => {
            const node = nodeMap.get(nodeData.id);
            
            // 添加父节点
            nodeData.parentIds.forEach(parentId => {
                const parent = nodeMap.get(parentId);
                if (parent && !node.parents.includes(parent)) {
                    node.parents.push(parent);
                }
            });
            
            // 添加子节点
            nodeData.childIds.forEach(childId => {
                const child = nodeMap.get(childId);
                if (child && !node.children.includes(child)) {
                    node.children.push(child);
                }
            });
        });
        
        // 设置根节点
        if (state.rootNodeId) {
            this.rootNode = nodeMap.get(state.rootNodeId);
        } else {
            this.rootNode = null;
        }
        
        // 设置下一个节点ID
        this.nextNodeId = state.nextNodeId;
        
        // 恢复选中状态
        if (state.selectedNodeIds) {
            this.selectedNodes = state.selectedNodeIds.map(id => nodeMap.get(id)).filter(Boolean);
        } else {
            this.selectedNodes = [];
        }
        
        if (state.selectedNodeId) {
            this.selectedNode = nodeMap.get(state.selectedNodeId);
        } else {
            this.selectedNode = this.selectedNodes.length > 0 ? this.selectedNodes[0] : null;
        }
        
        // 更新样式面板和渲染
        this.updateStylePanel();
        this.render();
    }

    deleteNode(node) {
        if (!node) return;
        
        // 保存状态
        this.saveState();
        
        // 检查是否是根节点
        const isRootNode = node === this.rootNode;
        
        // 获取所有当前根节点
        const allRootNodes = this.getRootNodes();
        
        // 保存根节点的子节点（如果需要的话）
        let rootChildren = [];
        if (isRootNode && node.children.length > 0) {
            rootChildren = [...node.children];
        }
        
        // 断开当前节点与其父节点的连接
        node.parents.forEach(parent => {
            parent.removeChild(node);
        });
        
        // 断开当前节点与其子节点的连接，但不删除子节点
        // 只有当子节点没有其他父节点时，才考虑是否删除
        const childrenCopy = [...node.children];
        childrenCopy.forEach(child => {
            // 从当前节点的子节点列表中移除
            const childIndex = node.children.indexOf(child);
            if (childIndex !== -1) {
                node.children.splice(childIndex, 1);
            }
            
            // 从子节点的父节点列表中移除当前节点
            const parentIndex = child.parents.indexOf(node);
            if (parentIndex !== -1) {
                child.parents.splice(parentIndex, 1);
            }
            
            // 如果子节点没有其他父节点且不是根节点，询问用户是否删除
            // 这里我们选择保留子节点，让用户手动决定
        });
        
        // 如果删除的是根节点，需要更新根节点引用
        if (isRootNode) {
            // 获取删除当前节点后的剩余根节点
            const remainingRootNodes = allRootNodes.filter(root => root !== node);
            
            if (remainingRootNodes.length > 0) {
                // 如果还有其他根节点，将rootNode引用更新为其中一个
                this.rootNode = remainingRootNodes[0];
            } else if (rootChildren.length > 0) {
                // 如果没有其他根节点，但有子节点，将第一个子节点设为新根
                this.rootNode = rootChildren[0];
            } else {
                // 如果既没有其他根节点，也没有子节点，设置rootNode为null
            this.rootNode = null;
            }
        }
        
        // 从节点列表中移除当前节点
        const nodeIndex = this.nodes.indexOf(node);
        if (nodeIndex !== -1) {
            this.nodes.splice(nodeIndex, 1);
        }
        
        // 如果删除的是选中节点，取消选择
        if (this.selectedNode === node) {
            this.selectedNode = null;
        }
        
        this.render();
    }
    
    // 复制选中的节点
    copySelectedNodes() {
        if (this.selectedNodes.length === 0) return;
        
        // 保存选中节点的信息，包括它们的连接关系
        this.copiedNodes = this.selectedNodes.map(node => {
            return {
                id: node.id,
                text: node.text,
                x: node.x,
                y: node.y,
                style: { ...node.style },
                // 保存父节点ID列表，用于粘贴时重建连接
                parentIds: node.parents.map(parent => parent.id),
                // 保存子节点ID列表，用于粘贴时重建连接
                childIds: node.children.map(child => child.id)
            };
        });
        
        // 同时将内容复制到系统剪贴板，支持多种格式
        this.copyToSystemClipboard();
    }
    
    // 将思维导图内容复制到系统剪贴板
    copyToSystemClipboard() {
        try {
            // 生成纯文本格式（作为降级方案）
            const plainText = this.generatePlainTextCopy();
            // 生成Markdown格式（作为降级方案）
            const markdown = this.generateMarkdownCopy();
            
            // 首先尝试以图片格式复制
            this.generateImageCopy()
                .then(imageBlob => {
                    // 使用Clipboard API复制图片
                    if (navigator.clipboard && navigator.clipboard.write) {
                        navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': imageBlob })
                        ])
                        .then(() => {
                            console.log('思维导图图片已复制到剪贴板');
                        })
                        .catch(err => {
                            console.error('复制图片到剪贴板失败:', err);
                            // 降级方案：使用文本格式
                            this.fallbackCopyToClipboard(markdown);
                        });
                    } else {
                        // 降级方案：使用文本格式
                        this.fallbackCopyToClipboard(markdown);
                    }
                })
                .catch(err => {
                    console.error('生成图片失败:', err);
                    // 降级方案：使用文本格式
                    this.fallbackCopyToClipboard(markdown);
                });
        } catch (error) {
            console.error('复制到剪贴板失败:', error);
        }
    }
    
    // 生成思维导图的图片格式用于复制
    async generateImageCopy() {
        return new Promise((resolve, reject) => {
            try {
                // 创建canvas的副本，避免修改原始内容
                const tempCanvas = this.canvas.cloneNode(true);
                
                // 遍历所有节点
                this.nodes.forEach(node => {
                    // 找到节点组
                    const nodeGroup = tempCanvas.querySelector(`#node-${node.id}`);
                    if (nodeGroup) {
                        // 移除所有可能的点击区域半圆
                        const allPaths = nodeGroup.querySelectorAll('path');
                        allPaths.forEach(path => {
                            // 检查是否是半圆点击区域
                            if (path.classList.contains('left-semicircle') || path.classList.contains('right-semicircle')) {
                                path.remove();
                            }
                        });
                        
                        // 替换foreignObject为SVG text元素，避免Canvas被污染
                        const foreignObjects = nodeGroup.querySelectorAll('.node-text-foreign-object');
                        foreignObjects.forEach(fo => {
                            // 创建SVG text元素
                            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                            
                            // 直接使用节点的中心位置作为文本位置
                            textElement.setAttribute('x', node.x); // 文本水平中心与节点中心一致
                            textElement.setAttribute('y', node.y); // 文本垂直中心与节点中心一致
                            textElement.setAttribute('text-anchor', 'middle');
                            textElement.setAttribute('dominant-baseline', 'middle');
                            
                            // 应用样式（确保所有样式都被正确应用）
                            textElement.setAttribute('fill', node.style.fontColor || '#000000');
                            textElement.setAttribute('font-size', `${node.style.fontSize || 14}px`);
                            textElement.setAttribute('font-family', node.style.fontFamily || 'Arial, sans-serif');
                            textElement.setAttribute('line-height', '1.4');
                            
                            // 处理多行文本
                            const lines = node.text.split('\n');
                            const fontSize = parseFloat(node.style.fontSize || 14);
                            const lineHeight = fontSize * 1.4;
                            const totalTextHeight = lines.length * lineHeight;
                            const yOffset = -totalTextHeight / 2 + lineHeight / 2;
                            
                            // 确保创建的tspan元素正确应用样式和位置
                            lines.forEach((line, index) => {
                                const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                                tspan.setAttribute('x', node.x); // 确保每行都居中
                                tspan.setAttribute('y', node.y + yOffset + index * lineHeight);
                                tspan.textContent = line;
                                // 确保tspan继承文本元素的样式
                                tspan.setAttribute('fill', node.style.fontColor || '#000000');
                                tspan.setAttribute('font-size', `${fontSize}px`);
                                tspan.setAttribute('font-family', node.style.fontFamily || 'Arial, sans-serif');
                                textElement.appendChild(tspan);
                            });
                            
                            // 替换foreignObject
                            fo.replaceWith(textElement);
                        });
                        
                        // 移除选中状态的底部横线
                        const bottomLines = nodeGroup.querySelectorAll('.selected-bottom-line');
                        bottomLines.forEach(line => {
                            line.remove();
                        });
                        
                        // 确保节点路径应用了正确的样式
                        const nodePath = nodeGroup.querySelector('path');
                        if (nodePath) {
                            // 确保路径样式与节点当前样式完全一致
                            nodePath.setAttribute('fill', node.style.nodeColor || '#ffffff');
                            nodePath.setAttribute('stroke', node.style.borderColor || '#000000');
                            nodePath.setAttribute('stroke-width', '2');
                            // 确保路径没有被错误地应用了其他样式
                            nodePath.removeAttribute('stroke-dasharray');
                            nodePath.removeAttribute('opacity');
                        }
                    }
                });
                
                // 确保连接线（曲线）的颜色正确
                const pngConnections = tempCanvas.querySelectorAll('.connection');
                pngConnections.forEach(connection => {
                    connection.setAttribute('stroke', this.connectionColor);
                    connection.setAttribute('stroke-width', '2');
                    connection.setAttribute('fill', 'none');
                });
                
                // 确保箭头的颜色正确
                const pngArrows = tempCanvas.querySelectorAll('.arrow');
                pngArrows.forEach(arrow => {
                    arrow.setAttribute('fill', this.connectionColor);
                    arrow.setAttribute('stroke', this.connectionColor);
                    arrow.setAttribute('stroke-width', '1');
                });
                
                // 计算所有节点的边界框，用于设置SVG的导出区域
                const pngBoundingBox = this.calculateNodesBoundingBox();
                
                // 设置SVG的viewBox和尺寸，确保包含所有节点并具有适当边距
                tempCanvas.setAttribute('viewBox', `${pngBoundingBox.minX} ${pngBoundingBox.minY} ${pngBoundingBox.width} ${pngBoundingBox.height}`);
                tempCanvas.setAttribute('width', `${pngBoundingBox.width}px`);
                tempCanvas.setAttribute('height', `${pngBoundingBox.height}px`);
                // 保持preserveAspectRatio为xMidYMid meet，确保内容不会被拉伸
                tempCanvas.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                
                // 移除画布平移，确保内容在新的viewBox中正确显示
                tempCanvas.style.transform = 'none';
                tempCanvas.style.left = '0';
                tempCanvas.style.top = '0';
                
                // 将修改后的SVG转换为PNG
                const svgData = new XMLSerializer().serializeToString(tempCanvas);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const svgUrl = URL.createObjectURL(svgBlob);
                
                // 创建一个临时的Image对象来绘制PNG
                const img = new Image();
                img.crossOrigin = 'anonymous'; // 设置crossOrigin属性，避免Canvas被污染
                img.onload = () => {
                    // 创建一个Canvas对象
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 提高分辨率倍数，值越大图像越清晰但文件越大
                    const resolution = 2;
                    
                    // 设置Canvas大小为边界框尺寸乘以分辨率倍数
                    canvas.width = pngBoundingBox.width * resolution;
                    canvas.height = pngBoundingBox.height * resolution;
                    
                    // 设置缩放因子
                    ctx.scale(resolution, resolution);
                    
                    // 绘制SVG内容到Canvas
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, pngBoundingBox.width, pngBoundingBox.height);
                    ctx.drawImage(img, 0, 0, pngBoundingBox.width, pngBoundingBox.height);
                    
                    // 将Canvas内容转换为Blob
                    canvas.toBlob(blob => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('无法将Canvas转换为Blob'));
                        }
                        // 清理
                        URL.revokeObjectURL(svgUrl);
                    }, 'image/png');
                };
                
                img.onerror = () => {
                    reject(new Error('图片加载失败'));
                    URL.revokeObjectURL(svgUrl);
                };
                
                img.src = svgUrl;
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // 生成纯文本格式的复制内容
    generatePlainTextCopy() {
        if (this.selectedNodes.length === 0) return '';
        
        // 如果只选中了一个节点，直接返回节点文本
        if (this.selectedNodes.length === 1) {
            return this.selectedNodes[0].text;
        }
        
        // 如果选中了多个节点，返回所有节点文本，用换行分隔
        return this.selectedNodes.map(node => node.text).join('\n');
    }
    
    // 生成Markdown格式的复制内容
    generateMarkdownCopy() {
        if (this.selectedNodes.length === 0) return '';
        
        // 如果只选中了一个节点，直接返回节点文本
        if (this.selectedNodes.length === 1) {
            return this.selectedNodes[0].text;
        }
        
        // 如果选中了多个节点，返回Markdown列表
        return this.selectedNodes.map(node => `- ${node.text}`).join('\n');
    }
    
    // 生成HTML格式的复制内容
    generateHtmlCopy() {
        if (this.selectedNodes.length === 0) return '';
        
        // 如果只选中了一个节点，直接返回节点文本
        if (this.selectedNodes.length === 1) {
            return `<p>${this.escapeHtml(this.selectedNodes[0].text)}</p>`;
        }
        
        // 如果选中了多个节点，返回HTML列表
        const items = this.selectedNodes.map(node => 
            `<li>${this.escapeHtml(node.text)}</li>`
        ).join('');
        
        return `<ul>${items}</ul>`;
    }
    
    // HTML转义函数
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // 降级复制方法（兼容不支持Clipboard API的浏览器）
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // 确保文本区域不可见
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                console.log('内容已复制到剪贴板');
            } else {
                console.error('复制到剪贴板失败');
            }
        } catch (err) {
            console.error('复制到剪贴板失败:', err);
        }
        
        document.body.removeChild(textArea);
    }
    
    // 粘贴复制的节点
    pasteNodes() {
        if (!this.copiedNodes || this.copiedNodes.length === 0) return;
        
        // 保存当前状态，将整个粘贴操作作为一个完整步骤
        this.saveState();
        
        // 计算偏移量，使粘贴的节点在原位置的基础上偏移一定距离
        const offsetX = 50;
        const offsetY = 50;
        
        // 存储新创建的节点，用于重建连接
        const newNodesMap = new Map();
        
        // 创建新节点，传递skipSaveState=true避免多次保存状态
        this.copiedNodes.forEach(copiedNode => {
            const newNode = this.createNode(
                copiedNode.text,
                copiedNode.x + offsetX,
                copiedNode.y + offsetY,
                [],
                true // 跳过保存状态
            );
            
            // 复制样式
            newNode.updateStyle(copiedNode.style);
            
            // 存储新节点，用于后续重建连接
            newNodesMap.set(copiedNode.id, newNode);
        });
        
        // 重建节点间的连接关系
        this.copiedNodes.forEach(copiedNode => {
            const newNode = newNodesMap.get(copiedNode.id);
            
            // 处理父节点连接
            copiedNode.parentIds.forEach(parentId => {
                const newParentNode = newNodesMap.get(parentId);
                if (newParentNode) {
                    // 如果父节点也在复制的节点中，则建立连接
                    newParentNode.addChild(newNode);
                }
            });
            
            // 处理子节点连接
            copiedNode.childIds.forEach(childId => {
                const newChildNode = newNodesMap.get(childId);
                if (newChildNode) {
                    // 如果子节点也在复制的节点中，则建立连接
                    newNode.addChild(newChildNode);
                }
            });
        });
        
        // 选择新粘贴的节点，便于继续编辑
        this.selectedNodes = Array.from(newNodesMap.values());
        this.selectedNode = this.selectedNodes[0];
        
        this.render();
    }
    
    toggleConnectionDirection() {
        if (!this.selectedNode) {
            alert('请选择一个节点来切换连接方向！');
            return;
        }
        
        // 切换连接方向
        this.selectedNode.isReverseConnection = !this.selectedNode.isReverseConnection;
        this.render();
    }
    
    addParentNode(node = null) {
        const targetNode = node || this.selectedNode;
        
        if (!targetNode) {
            alert('请先选择一个节点来添加父节点！');
            return;
        }
        
        // 计算新节点位置（在目标节点的左侧）
        // 根据节点实际尺寸计算合适的距离，保持美观
        const spacing = 50; // 节点之间的间距
        const estimatedNodeHeight = 50; // 估计的新节点高度
        const estimatedNodeWidth = 100; // 估计的新节点宽度
        
        let newX, newY;
        
        if (targetNode.parents.length === 0) {
            // 第一个父节点，放在目标节点左侧，距离为默认节点宽度的3倍
            newX = targetNode.x - targetNode.width / 2 - estimatedNodeWidth * 3 - estimatedNodeWidth / 2;
            newY = targetNode.y; // 与目标节点保持同一水平中心线
        } else {
            // 不是第一个父节点，找到最下方的父节点，在其下方添加
            const bottommostParent = targetNode.parents.reduce((bottommost, parent) => {
                const bottommostBounds = bottommost.getNodeBounds();
                const parentBounds = parent.getNodeBounds();
                return (parentBounds.bottom > bottommostBounds.bottom) ? parent : bottommost;
            }, targetNode.parents[0]); // 提供初始值
            
            const bottommostBounds = bottommostParent.getNodeBounds();
            newX = bottommostParent.x; // 与最下方父节点保持同一垂直线
            newY = bottommostBounds.bottom + spacing + estimatedNodeHeight / 2;
        }
        
        // 直接创建新节点，不使用createNode函数以避免额外的saveState调用
        const newNode = new Node(this.nextNodeId++, '', newX, newY);
        
        // 添加到节点列表
        this.nodes.push(newNode);
        
        // 添加目标节点到新节点的子节点列表
        newNode.addChild(targetNode);
        
        // 如果目标节点是根节点，更新根节点引用
        if (targetNode === this.rootNode) {
            this.rootNode = newNode;
        }
        
        // 保持选中原节点
        this.selectedNode = targetNode;
        this.selectedNodes = [targetNode];
        this.updateStylePanel();
        this.saveState(); // 统一保存状态，确保添加父节点和连接线作为一步撤销
        this.render();
    }
    
    getRootNodes() {
        // 获取所有根节点（没有父节点的节点）
        return this.nodes.filter(node => node.parents.length === 0);
    }
    
    // 保留这个方法以保持向后兼容
    getNodeBounds(node) {
        return node.getNodeBounds();
    }
    
    selectNode(node) {
        this.selectedNode = node;
        this.selectedNodes = node ? [node] : [];
        this.updateStylePanel();
        this.render();
    }
    
    updateNodeText(node, newText) {
        // 保存状态到历史记录
        this.saveState();
        
        node.text = newText;
        this.render();
    }
    
    render() {
        // 清空画布
        while (this.canvas.firstChild) {
            try {
                if (this.canvas.contains(this.canvas.firstChild)) {
                    this.canvas.removeChild(this.canvas.firstChild);
                }
            } catch (error) {
                // 忽略移除失败的错误，可能是由于竞态条件导致节点已被移除
                break;
            }
        }
        
        // 计算节点尺寸
        this.calculateNodeSizes();
        
        // 渲染连接线
        this.renderConnections();
        
        // 渲染所有节点，确保所有节点都被显示，包括多个父节点的情况
        // 使用集合避免重复渲染节点
        const renderedNodes = new Set();
        
        // 渲染节点辅助函数
        const renderNodeHelper = (node) => {
            if (renderedNodes.has(node.id)) return;
            renderedNodes.add(node.id);
            
            // 创建节点组
            const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            nodeGroup.setAttribute('class', 'node');
            nodeGroup.setAttribute('id', `node-${node.id}`);
            // 应用画布平移
            nodeGroup.setAttribute('transform', `translate(${this.canvasOffsetX}, ${this.canvasOffsetY})`);
            
            // 检查节点是否被选中
            if (this.selectedNodes.includes(node)) {
                nodeGroup.classList.add('selected');
                
                // 创建选中时的底部横线
                const bottomLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                const lineY = node.y + node.height / 2 + 10; // 在节点底部下方10像素处
                // 计算底部横边的长度：总宽度减去两端半圆的直径
                const lineLength = node.width - node.height;
                // 确保横线居中显示
                bottomLine.setAttribute('x1', node.x - lineLength / 2);
                bottomLine.setAttribute('y1', lineY);
                bottomLine.setAttribute('x2', node.x + lineLength / 2);
                bottomLine.setAttribute('y2', lineY);
                bottomLine.setAttribute('stroke', '#666666'); // 灰色横线
                bottomLine.setAttribute('stroke-width', '3px');
                bottomLine.setAttribute('class', 'selected-bottom-line');
                
                // 添加到底部横线节点组
                nodeGroup.appendChild(bottomLine);
            }
            
                    // 创建跑道形状（圆角矩形 + 两端半圆）
            const rectPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            
            const width = node.width;
            const height = node.height;
            const radius = height / 2;
            const x = node.x - width / 2;
            const y = node.y - height / 2;
            
            // 绘制跑道形状路径
            const pathData = [
                `M${x + radius} ${y}`,
                `L${x + width - radius} ${y}`,
                `A${radius} ${radius} 0 0 1 ${x + width} ${y + radius}`,
                `L${x + width} ${y + height - radius}`,
                `A${radius} ${radius} 0 0 1 ${x + width - radius} ${y + height}`,
                `L${x + radius} ${y + height}`,
                `A${radius} ${radius} 0 0 1 ${x} ${y + height - radius}`,
                `L${x} ${y + radius}`,
                `A${radius} ${radius} 0 0 1 ${x + radius} ${y}`,
                'Z'
            ].join(' ');
            
            rectPath.setAttribute('d', pathData);
            rectPath.setAttribute('fill', node.style.nodeColor);
            rectPath.setAttribute('stroke', node.style.borderColor);
            rectPath.setAttribute('stroke-width', '2');
            
            // 为了保持事件监听一致性，将rectPath赋值给rect变量
            const rect = rectPath;
            
        // 扩大点击区域：水平扩展2像素，垂直方向各扩展2像素，与视觉阴影区域匹配
        const expandedRadius = radius + 2;
        
        // 创建左侧半圆形点击区域（添加父节点）
        const leftSemiCircle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        // 使用与节点左侧半圆匹配且扩大的路径，确保点击区域与视觉阴影区域一致
        const leftPathData = `M${x - 2} ${y + expandedRadius} A${expandedRadius} ${expandedRadius} 0 0 1 ${x + expandedRadius} ${y - 2} L${x + expandedRadius} ${y + height + 2} A${expandedRadius} ${expandedRadius} 0 0 1 ${x - 2} ${y + expandedRadius} Z`;
        leftSemiCircle.setAttribute('d', leftPathData);
        leftSemiCircle.setAttribute('fill', 'rgba(0, 0, 0, 0.01)'); // 使用几乎透明的颜色，但确保可以点击
        leftSemiCircle.setAttribute('stroke', 'none');
        leftSemiCircle.setAttribute('class', 'left-semicircle');
        
        // 左侧半圆点击事件
        leftSemiCircle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addParentNode(node);
        });
        
        // 左侧半圆悬停效果
        leftSemiCircle.addEventListener('mouseenter', () => {
            leftSemiCircle.setAttribute('fill', 'rgba(0, 0, 0, 0.15)');
        });
        
        leftSemiCircle.addEventListener('mouseleave', () => {
            leftSemiCircle.setAttribute('fill', 'rgba(0, 0, 0, 0.01)'); // 恢复几乎透明的状态
        });
            
            // 创建右侧半圆形点击区域（添加子节点）
        const rightSemiCircle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        // 使用与节点右侧半圆匹配且扩大的路径，确保点击区域与视觉阴影区域一致
        // 关键修复：将sweep-flag从1改为0，使用逆时针方向绘制半圆
        const rightPathData = `M${x + width + 2} ${y + expandedRadius} A${expandedRadius} ${expandedRadius} 0 0 0 ${x + width - expandedRadius} ${y - 2} L${x + width - expandedRadius} ${y + height + 2} A${expandedRadius} ${expandedRadius} 0 0 0 ${x + width + 2} ${y + expandedRadius} Z`;
        rightSemiCircle.setAttribute('d', rightPathData);
        rightSemiCircle.setAttribute('fill', 'rgba(0, 0, 0, 0.01)'); // 使用几乎透明的颜色，但确保可以点击
        rightSemiCircle.setAttribute('stroke', 'none');
        rightSemiCircle.setAttribute('class', 'right-semicircle');
        
        // 右侧半圆点击事件
        rightSemiCircle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addChildNode(node);
        });
        
        // 右侧半圆悬停效果
        rightSemiCircle.addEventListener('mouseenter', () => {
            rightSemiCircle.setAttribute('fill', 'rgba(0, 0, 0, 0.15)');
        });
        
        rightSemiCircle.addEventListener('mouseleave', () => {
            rightSemiCircle.setAttribute('fill', 'rgba(0, 0, 0, 0.01)'); // 恢复几乎透明的状态
        });
            
            // 创建foreignObject用于支持多行文本
            const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
            foreignObject.setAttribute('x', node.x - node.width / 2 + 10);
            foreignObject.setAttribute('y', node.y - node.height / 2 + 10);
            foreignObject.setAttribute('width', node.width - 20);
            foreignObject.setAttribute('height', node.height - 20);
            foreignObject.setAttribute('class', 'node-text-foreign-object');
            foreignObject.setAttribute('pointer-events', 'none'); // 允许事件冒泡到nodeGroup
            
            // 创建div元素用于显示文本
            const textDiv = document.createElement('div');
            textDiv.style.width = '100%';
            textDiv.style.height = '100%';
            textDiv.style.textAlign = 'left';
            textDiv.style.display = 'flex';
            textDiv.style.alignItems = 'center';
            textDiv.style.justifyContent = 'center';
            textDiv.style.wordWrap = 'break-word';
            textDiv.style.whiteSpace = 'pre-line';
            textDiv.style.overflowWrap = 'break-word'; // 更现代的属性，确保长单词自动换行
            textDiv.style.hyphens = 'auto'; // 启用自动连字符
            textDiv.style.color = node.style.fontColor;
            textDiv.style.fontSize = `${node.style.fontSize}px`;
            textDiv.style.fontFamily = node.style.fontFamily;
            textDiv.style.lineHeight = '1.4';
            textDiv.style.pointerEvents = 'none'; // 允许事件冒泡到nodeGroup
            // 防止文本被选择
            textDiv.style.userSelect = 'none';
            textDiv.style.webkitUserSelect = 'none';
            textDiv.style.mozUserSelect = 'none';
            textDiv.style.msUserSelect = 'none';
            // 使用自动换行后的文本或原始文本
            textDiv.textContent = node.wrappedText ? node.wrappedText.join('\n') : node.text;
            
            // 添加到foreignObject
            foreignObject.appendChild(textDiv);
            
            // 添加事件监听器
            nodeGroup.addEventListener('click', (e) => {
                // 检查是否是双击后的第二次单击
                if (!e.detail || e.detail < 2) {
                    // 如果处于编辑模式，不执行任何操作
                    if (this.isEditingNode) {
                        return;
                    }
                    
                    // 检查点击目标是否是文本编辑区域
                    const isTextArea = e.target.closest('textarea') || e.target.closest('.edit-foreign-object');
                    if (!isTextArea) {
                        this.selectNode(node);
                    }
                }
            });
            
            // 双击编辑 - 提高优先级
            nodeGroup.addEventListener('dblclick', (e) => {
                console.log('DBLCLICK event captured for node:', node.id, 'detail:', e.detail);
                e.stopPropagation();
                e.preventDefault();
                this.editNodeText(node);
            }, true);
            
            // 拖拽事件 - 确保不会影响双击和文本编辑
        nodeGroup.addEventListener('mousedown', (e) => {
            // 检查是否在编辑模式下
            if (this.isEditingNode) {
                // 如果是编辑模式，不触发拖拽，允许文本选择
                // 阻止事件冒泡，确保不影响文本选择
                e.stopPropagation();
                return;
            }
            
            // 只有单击才触发拖拽
            if (!e.detail || e.detail < 2) {
                // 检查点击目标是否是文本编辑区域
                const isTextArea = e.target.closest('textarea') || e.target.closest('.edit-foreign-object');
                if (!isTextArea) {
                    this.startDrag(e, node);
                } else {
                    // 如果点击的是文本编辑区域，阻止事件冒泡
                    e.stopPropagation();
                }
            }
        });
        
        // 移动设备触摸事件 - 确保不会影响双击
        nodeGroup.addEventListener('touchstart', (e) => {
            // 只有单指触摸才触发拖拽
            if (e.touches.length === 1) {
                this.startTouchDrag(e, node);
            }
        });
            
            // 添加到画布 - 调整顺序，确保按钮位于文本区域之上
            nodeGroup.appendChild(rect);
            nodeGroup.appendChild(foreignObject);
            nodeGroup.appendChild(leftSemiCircle);
            nodeGroup.appendChild(rightSemiCircle);
            this.canvas.appendChild(nodeGroup);
            
            // 渲染所有子节点
            node.children.forEach(child => renderNodeHelper(child));
        };
        
        // 首先渲染所有根节点及其子树
        const allRootNodes = this.getRootNodes();
        allRootNodes.forEach(rootNode => {
            renderNodeHelper(rootNode);
        });
        
        // 然后渲染所有其他未被渲染的节点（多父节点的情况）
        this.nodes.forEach(node => {
            renderNodeHelper(node);
        });
        
        // 渲染对齐和间距提示线
        this.renderGuides();
        
        // 渲染缩略图
        this.renderThumbnail();
        
        // 如果正在进行框选，重新绘制框选矩形
        // 这样可以确保在重新渲染画布后，框选矩形仍然可见
        if (this.isSelecting && this.selectionRect) {
            // 计算框选矩形的坐标和尺寸，支持所有方向
            const x1 = Math.min(this.selectionStartX, this.selectionEndX);
            const y1 = Math.min(this.selectionStartY, this.selectionEndY);
            const x2 = Math.max(this.selectionStartX, this.selectionEndX);
            const y2 = Math.max(this.selectionStartY, this.selectionEndY);
            
            const width = x2 - x1;
            const height = y2 - y1;
            
            // 检查矩形是否已存在于画布中
            if (!this.canvas.contains(this.selectionRect)) {
                this.canvas.appendChild(this.selectionRect);
            }
            
            // 更新框选矩形的位置和大小，使用屏幕坐标（与startSelection和selectionMove一致）
            this.selectionRect.setAttribute('x', x1);
            this.selectionRect.setAttribute('y', y1);
            this.selectionRect.setAttribute('width', width);
            this.selectionRect.setAttribute('height', height);
        }
    }
    

    
    calculateNodeSizes() {
        const ctx = document.createElement('canvas').getContext('2d');
        const lineHeight = 1.4; // 行高倍数
        const padding = 15; // 节点内边距
        const minNodeHeight = 45; // 最小节点高度
        const maxNodeWidth = 400; // 最大节点宽度（限制为400像素）
        const maxContentWidth = maxNodeWidth - padding * 2; // 节点内容的最大宽度
        
        // 文本自动换行函数
        const wrapText = (text, maxWidth) => {
            const lines = [];
            
            // 检查是否包含空格
            if (text.includes(' ')) {
                // 基于单词的换行
                const words = text.split(' ');
                let currentLine = words[0];
                
                for (let i = 1; i < words.length; i++) {
                    const testLine = currentLine + ' ' + words[i];
                    const testWidth = ctx.measureText(testLine).width;
                    
                    if (testWidth <= maxWidth) {
                        currentLine = testLine;
                    } else {
                        lines.push(currentLine);
                        currentLine = words[i];
                    }
                }
                lines.push(currentLine);
            } else {
                // 基于字符的换行（处理无空格长文本）
                let currentLine = '';
                
                for (let i = 0; i < text.length; i++) {
                    const testLine = currentLine + text[i];
                    const testWidth = ctx.measureText(testLine).width;
                    
                    if (testWidth <= maxWidth) {
                        currentLine = testLine;
                    } else {
                        if (currentLine) {
                            lines.push(currentLine);
                        }
                        currentLine = text[i];
                    }
                }
                if (currentLine) {
                    lines.push(currentLine);
                }
            }
            
            return lines;
        };
        
        this.nodes.forEach(node => {
            ctx.font = `${node.style.fontSize}px ${node.style.fontFamily}`;
            const fontHeight = parseInt(node.style.fontSize) * lineHeight;
            
            // 处理多行文本，实现自动换行
            const originalLines = node.text.split('\n');
            const wrappedLines = [];
            
            originalLines.forEach(line => {
                // 如果行文本超过最大内容宽度，自动换行
                if (ctx.measureText(line).width > maxContentWidth) {
                    const lineWrappedLines = wrapText(line, maxContentWidth);
                    wrappedLines.push(...lineWrappedLines);
                } else {
                    wrappedLines.push(line);
                }
            });
            
            // 计算每行的宽度和总行高
            let maxLineWidth = 0;
            let totalHeight = 0;
            
            wrappedLines.forEach(line => {
                const lineWidth = ctx.measureText(line).width;
                maxLineWidth = Math.max(maxLineWidth, lineWidth);
                totalHeight += fontHeight;
            });
            
            // 保存自动换行后的文本，供渲染时使用
            node.wrappedText = wrappedLines;
            
            // 设置节点宽度（考虑内边距和最大宽度限制）
            const calculatedWidth = Math.max(maxLineWidth + padding * 2, 100);
            node.width = Math.min(calculatedWidth, maxNodeWidth);
            
            // 设置节点高度（考虑内边距和最小高度）
            node.height = Math.max(totalHeight + padding * 2, minNodeHeight);
        });
    }
    

    
    renderConnections() {
        // 清空之前的连接和箭头
        const allConnections = this.canvas.querySelectorAll('.connection');
        allConnections.forEach(conn => conn.remove());
        
        this.nodes.forEach(node => {
            // 遍历所有父节点
            node.parents.forEach(parentNode => {
                // 计算节点左侧端点位置（精确到像素，确保箭头不进入节点）
                // 节点左侧边缘 = node.x - node.width / 2
                const nodeLeftX = node.x - node.width / 2;
                const nodeLeftY = node.y;
                
                // 箭头参数设置（固定值，确保箭头大小一致）
                const arrowLength = 12; // 箭头长度（从节点边缘到箭头左端）
                const arrowWidth = 8; // 箭头宽度（箭头尖端处的宽度）
                
                // 箭头起点位置（箭头最左端）
                const arrowStartX = nodeLeftX - arrowLength;
                const arrowStartY = nodeLeftY;
                
                // 绘制水平箭头，指向节点左侧端点
                // 箭头路径：精确计算三角形，确保尖端正好指向nodeLeftX（节点左侧边缘）
                const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                // 三角形箭头：左端点 - 尖端 - 右端点，形成三角形
                const arrowPath = `M ${arrowStartX + this.canvasOffsetX} ${nodeLeftY - arrowWidth/2 + this.canvasOffsetY} ` +
                                `L ${nodeLeftX + this.canvasOffsetX} ${nodeLeftY + this.canvasOffsetY} ` +
                                `L ${arrowStartX + this.canvasOffsetX} ${nodeLeftY + arrowWidth/2 + this.canvasOffsetY} Z`;
                
                arrow.setAttribute('d', arrowPath);
                arrow.setAttribute('fill', this.connectionColor);
                arrow.setAttribute('stroke', this.connectionColor);
                arrow.setAttribute('stroke-width', '1');
                arrow.setAttribute('pointer-events', 'none');
                arrow.setAttribute('class', 'arrow'); // 使用专门的arrow类
                
                this.canvas.appendChild(arrow);
                
                // 计算父节点连接点（右侧中心）
                const parentRightX = parentNode.x + parentNode.width / 2;
                const parentRightY = parentNode.y;
                
                // 计算曲线控制点，确保曲线平滑且美观
                const deltaX = arrowStartX - parentRightX;
                const deltaY = arrowStartY - parentRightY;
                
                const baseControlOffset = 50;
                const controlOffsetX = Math.max(baseControlOffset, Math.abs(deltaX) * 0.3);
                const controlOffsetY = Math.min(Math.abs(deltaY) * 0.4, baseControlOffset);
                
                // 应用画布平移（确保所有坐标都应用相同的平移）
                const translatedParentX = parentRightX + this.canvasOffsetX;
                const translatedParentY = parentRightY + this.canvasOffsetY;
                const translatedArrowX = arrowStartX + this.canvasOffsetX;
                const translatedArrowY = arrowStartY + this.canvasOffsetY;
                
                // 绘制贝塞尔曲线，从父节点右侧连接到箭头左端
                const curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                
                // 贝塞尔曲线控制点：
                // 1. 父节点侧：向右延伸，上下方向根据子节点位置调整
                // 2. 箭头侧：向左延伸，上下方向根据子节点位置调整
                const control1X = translatedParentX + controlOffsetX;
                const control1Y = translatedParentY + (deltaY > 0 ? controlOffsetY : -controlOffsetY);
                const control2X = translatedArrowX - controlOffsetX;
                const control2Y = translatedArrowY + (deltaY > 0 ? -controlOffsetY : controlOffsetY);
                
                // 曲线终点精确设置为箭头的起点(arrowStartX)，确保与箭头无缝连接
                const curvePath = `M ${translatedParentX} ${translatedParentY} ` +
                                `C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${translatedArrowX} ${translatedArrowY}`;
                
                curve.setAttribute('d', curvePath);
                curve.setAttribute('class', 'connection');
                curve.setAttribute('stroke', this.connectionColor);
                curve.setAttribute('stroke-width', '2');
                curve.setAttribute('fill', 'none');
                curve.setAttribute('pointer-events', 'none');
                
                this.canvas.appendChild(curve);
            });
        });
    }
    
    calculateConnectionPoints(parentNode, childNode) {
        // 父节点连接点（右侧中心）
        const startX = parentNode.x + parentNode.width / 2;
        const startY = parentNode.y;
        
        // 子节点左侧边缘位置（箭头尖端指向的位置）
        const childLeftX = childNode.x - childNode.width / 2;
        
        // 箭头长度为12px（与renderConnections保持一致）
        const arrowLength = 12;
        
        // 曲线终点 = 箭头起点（箭头左侧位置）
        const endX = childLeftX - arrowLength;
        const endY = childNode.y;
        
        // 返回曲线的起点（父节点右侧）和终点（箭头左侧）
        return { startX, startY, endX, endY };
    }
    
    // 将客户端坐标转换为SVG画布坐标
    clientToSvgCoords(clientX, clientY) {
        // 简化坐标转换：直接使用屏幕坐标，不考虑画布平移
        // 这样可以避免坐标系统混乱
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    startSelection(e) {
        // 如果处于编辑模式，不执行框选
        if (this.isEditingNode) {
            return;
        }
        
        this.isSelecting = true;
        
        // 直接使用屏幕坐标，不进行复杂转换
        const rect = this.canvas.getBoundingClientRect();
        this.selectionStartX = e.clientX - rect.left;
        this.selectionStartY = e.clientY - rect.top;
        this.selectionEndX = this.selectionStartX;
        this.selectionEndY = this.selectionStartY;
        
        // 创建框选矩形，直接使用屏幕坐标
        this.selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.selectionRect.setAttribute('fill', 'rgba(0, 120, 215, 0.1)');
        this.selectionRect.setAttribute('stroke', 'rgba(0, 120, 215, 0.7)');
        this.selectionRect.setAttribute('stroke-width', '1');
        this.selectionRect.setAttribute('x', this.selectionStartX);
        this.selectionRect.setAttribute('y', this.selectionStartY);
        this.selectionRect.setAttribute('width', 0);
        this.selectionRect.setAttribute('height', 0);
        this.canvas.appendChild(this.selectionRect);
        
        // 添加事件监听器
        document.addEventListener('mousemove', this.selectionMove);
        document.addEventListener('mouseup', this.stopSelection);
    }
    
    startDrag(e, node) {
        // 安全检查：如果正在编辑节点，绝对不执行拖拽
        if (this.isEditingNode) {
            return;
        }
        
        this.isDragging = true;
        this.dragNode = node;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        // 阻止浏览器默认行为
        e.preventDefault();
        
        // 添加事件监听器（使用constructor中已绑定的方法）
        document.addEventListener('mousemove', this.drag);
        document.addEventListener('mouseup', this.stopDrag);
        
        e.stopPropagation();
    }
    
    // 处理移动设备的触摸开始事件
    startTouchDrag(e, node) {
        this.isDragging = true;
        this.dragNode = node;
        this.dragStartX = e.touches[0].clientX;
        this.dragStartY = e.touches[0].clientY;
        
        // 保存初始位置
        this.dragStartNodeX = node.x;
        this.dragStartNodeY = node.y;
        
        // 获取需要拖动的所有节点的DOM元素
        this.draggedNodeElements = {};
        if (this.selectedNodes.length > 1) {
            this.selectedNodes.forEach(selectedNode => {
                const nodeElement = document.getElementById(`node-${selectedNode.id}`);
                if (nodeElement) {
                    this.draggedNodeElements[selectedNode.id] = {
                        element: nodeElement,
                        startX: selectedNode.x,
                        startY: selectedNode.y
                    };
                    // 添加will-change属性，优化浏览器渲染
                    nodeElement.style.willChange = 'transform';
                }
            });
        } else {
            const nodeElement = document.getElementById(`node-${node.id}`);
            if (nodeElement) {
                this.draggedNodeElements[node.id] = {
                    element: nodeElement,
                    startX: node.x,
                    startY: node.y
                };
                // 添加will-change属性，优化浏览器渲染
                nodeElement.style.willChange = 'transform';
            }
        }
        
        // 阻止浏览器默认行为，防止页面滚动和缩放
        e.preventDefault();
        
        // 添加触摸移动和结束事件监听器，明确指定passive: false以允许preventDefault()
        document.addEventListener('touchmove', this.touchDrag, { passive: false });
        document.addEventListener('touchend', this.stopTouchDrag, { passive: false });
        document.addEventListener('touchcancel', this.stopTouchDrag, { passive: false });
        
        e.stopPropagation();
    }
    
    drag(e) {
        // 如果处于编辑模式，不执行拖动
        if (this.isEditingNode) {
            return;
        }
        
        if (!this.isDragging || !this.dragNode) return;
        
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;
        
        // 如果有多个节点被选中，作为整体移动
        if (this.selectedNodes.length > 1) {
            // 移动所有选中的节点
            this.selectedNodes.forEach(node => {
                const newX = node.x + deltaX;
                const newY = node.y + deltaY;
                node.updatePosition(newX, newY);
            });
        } else {
            // 只移动单个节点
            const newX = this.dragNode.x + deltaX;
            const newY = this.dragNode.y + deltaY;
            this.dragNode.updatePosition(newX, newY);
        }
        
        // 检测对齐（仅用于显示提示线，基于主节点dragNode）
        this.alignmentGuides = this.detectAlignment(this.dragNode);
        
        // 检测间距相等（仅用于显示提示线，基于主节点dragNode）
        this.spacingGuides = this.detectEqualSpacing(this.dragNode);
        
        // 更新拖拽起始位置
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        this.render();
    }
    
    // 处理移动设备的触摸移动事件
    touchDrag(e) {
        if (!this.isDragging || !this.dragNode || e.touches.length !== 1) return;
        
        // 计算当前触摸点相对于拖动起始点的总偏移量
        const totalDeltaX = e.touches[0].clientX - this.dragStartX;
        const totalDeltaY = e.touches[0].clientY - this.dragStartY;
        
        // 如果移动距离很小，不执行任何操作，减少不必要的计算
        if (Math.abs(totalDeltaX) < 1 && Math.abs(totalDeltaY) < 1) {
            return;
        }
        
        // 使用transform进行临时位置更新，避免每次都重新渲染整个思维导图
        Object.values(this.draggedNodeElements).forEach(draggedElement => {
            const element = draggedElement.element;
            
            // 应用transform - 使用总偏移量
            element.style.transform = `translate(${totalDeltaX}px, ${totalDeltaY}px)`;
        });
        
        // 阻止浏览器默认行为，防止页面滚动
        e.preventDefault();
    }
    
    selectionMove(e) {
        // 如果处于编辑模式，不执行框选
        if (this.isEditingNode) {
            return;
        }
        
        if (!this.isSelecting || !this.selectionRect) return;
        
        // 直接使用屏幕坐标
        const rect = this.canvas.getBoundingClientRect();
        this.selectionEndX = e.clientX - rect.left;
        this.selectionEndY = e.clientY - rect.top;
        
        // 计算框选矩形的坐标，支持所有方向
        const x1 = Math.min(this.selectionStartX, this.selectionEndX);
        const y1 = Math.min(this.selectionStartY, this.selectionEndY);
        const x2 = Math.max(this.selectionStartX, this.selectionEndX);
        const y2 = Math.max(this.selectionStartY, this.selectionEndY);
        
        const width = x2 - x1;
        const height = y2 - y1;
        
        // 更新框选矩形（直接使用屏幕坐标）
        this.selectionRect.setAttribute('x', x1);
        this.selectionRect.setAttribute('y', y1);
        this.selectionRect.setAttribute('width', width);
        this.selectionRect.setAttribute('height', height);
        
        // 碰撞检测：检查节点是否与框选区域相交
        const selectedNodes = [];
        
        this.nodes.forEach(node => {
            // 计算节点的世界坐标边界
            const nodeLeft = node.x - node.width / 2;
            const nodeRight = node.x + node.width / 2;
            const nodeTop = node.y - node.height / 2;
            const nodeBottom = node.y + node.height / 2;
            
            // 计算框选区域的世界坐标边界（减去画布平移）
            const selectionWorldLeft = x1 - this.canvasOffsetX;
            const selectionWorldRight = x2 - this.canvasOffsetX;
            const selectionWorldTop = y1 - this.canvasOffsetY;
            const selectionWorldBottom = y2 - this.canvasOffsetY;
            
            // 宽松的碰撞检测：只要节点与框选区域有任何重叠就选中
            // 在世界坐标上进行比较，避免双重偏移问题
            if (nodeLeft < selectionWorldRight && nodeRight > selectionWorldLeft && nodeTop < selectionWorldBottom && nodeBottom > selectionWorldTop) {
                selectedNodes.push(node);
            }
        });
        
        // 更新选中状态
        this.selectedNodes = selectedNodes;
        this.selectedNode = selectedNodes.length > 0 ? selectedNodes[0] : null;
        
        // 重新渲染显示选中效果
        this.render();
    }
    
    stopSelection() {
        // 如果处于编辑模式，不执行任何操作
        if (this.isEditingNode) {
            // 清理事件监听器以避免内存泄漏
            document.removeEventListener('mousemove', this.selectionMove);
            document.removeEventListener('mouseup', this.stopSelection);
            // 重置框选状态
            this.isSelecting = false;
            this.selectionRect = null;
            return;
        }
        
        // 移除框选矩形
        if (this.selectionRect && this.canvas.contains(this.selectionRect)) {
            this.canvas.removeChild(this.selectionRect);
        }
        
        // 重新计算选中的节点，确保与视觉反馈完全一致
        // 计算框选矩形的坐标，支持所有方向
        const x1 = Math.min(this.selectionStartX, this.selectionEndX);
        const y1 = Math.min(this.selectionStartY, this.selectionEndY);
        const x2 = Math.max(this.selectionStartX, this.selectionEndX);
        const y2 = Math.max(this.selectionStartY, this.selectionEndY);
        
        // 碰撞检测：检查节点是否与框选区域相交
        const selectedNodes = [];
        
        this.nodes.forEach(node => {
            // 计算节点的世界坐标边界
            const nodeLeft = node.x - node.width / 2;
            const nodeRight = node.x + node.width / 2;
            const nodeTop = node.y - node.height / 2;
            const nodeBottom = node.y + node.height / 2;
            
            // 计算框选区域的世界坐标边界（减去画布平移）
            const selectionWorldLeft = x1 - this.canvasOffsetX;
            const selectionWorldRight = x2 - this.canvasOffsetX;
            const selectionWorldTop = y1 - this.canvasOffsetY;
            const selectionWorldBottom = y2 - this.canvasOffsetY;
            
            // 宽松的碰撞检测：只要节点与框选区域有任何重叠就选中
            // 在世界坐标上进行比较，避免双重偏移问题
            if (nodeLeft < selectionWorldRight && nodeRight > selectionWorldLeft && nodeTop < selectionWorldBottom && nodeBottom > selectionWorldTop) {
                selectedNodes.push(node);
            }
        });
        
        // 更新选中状态
        this.selectedNodes = selectedNodes;
        this.selectedNode = selectedNodes.length > 0 ? selectedNodes[0] : null;
        
        // 重置框选状态
        this.isSelecting = false;
        this.selectionRect = null;
        
        // 移除事件监听器
        document.removeEventListener('mousemove', this.selectionMove);
        document.removeEventListener('mouseup', this.stopSelection);
        
        // 设置标志，防止click事件立即取消选择
        this.justFinishedSelection = true;
        
        // 重新渲染画布以确保选中状态正确显示
        this.render();
    }
    
    stopDrag() {
        // 如果有正在拖拽的节点，尝试自动对齐和等间距调整
        if (this.dragNode) {
            // 使用拖拽过程中已经检测到的对齐线和间距线，确保与显示的提示线一致
            const alignmentGuides = this.alignmentGuides;
            const spacingGuides = this.spacingGuides;
            
            let newX = this.dragNode.x;
            let newY = this.dragNode.y;
            let hasSpacingGuide = false;
            
            // 优先应用等间距调整
            if (spacingGuides.length > 0) {
                // 取第一个等间距位置
                const spacingGuide = spacingGuides[0];
                // 根据间距提示线类型更新相应的坐标
                if (spacingGuide.type === 'horizontal') {
                    newX = spacingGuide.position;
                } else {
                    newY = spacingGuide.position;
                }
                hasSpacingGuide = true;
            }
            
            // 同时应用对齐调整（即使有间距线也会检查对齐）
            if (alignmentGuides.length > 0) {
                const verticalGuide = alignmentGuides.find(guide => guide.type === 'vertical'); // 垂直方向的线，用于水平对齐
                const horizontalGuide = alignmentGuides.find(guide => guide.type === 'horizontal'); // 水平方向的线，用于垂直对齐
                
                if (verticalGuide) {
                    // 根据对齐类型调整X坐标（垂直方向的线表示水平对齐）
                    const otherNode = this.nodes.find(n => n.id === verticalGuide.nodeId);
                    const otherBounds = this.getNodeBounds(otherNode);
                    
                    if (verticalGuide.axis === 'left') {
                        newX = otherBounds.left + this.dragNode.width / 2;
                    } else if (verticalGuide.axis === 'right') {
                        newX = otherBounds.right - this.dragNode.width / 2;
                    }
                }
                
                if (horizontalGuide) {
                    // 根据对齐类型调整Y坐标（水平方向的线表示垂直对齐）
                    const otherNode = this.nodes.find(n => n.id === horizontalGuide.nodeId);
                    const otherBounds = this.getNodeBounds(otherNode);
                    
                    if (horizontalGuide.axis === 'top') {
                        newY = otherBounds.top + this.dragNode.height / 2;
                    } else if (horizontalGuide.axis === 'bottom') {
                        newY = otherBounds.bottom - this.dragNode.height / 2;
                    } else if (horizontalGuide.axis === 'center') {
                        newY = otherNode.y;
                    }
                }
            }
            
            // 如果位置有变化，更新节点位置
            if (newX !== this.dragNode.x || newY !== this.dragNode.y) {
                // 计算位置偏移量
                const offsetX = newX - this.dragNode.x;
                const offsetY = newY - this.dragNode.y;
                
                // 如果有多个节点被选中，作为整体应用偏移（包括对齐）
                if (this.selectedNodes.length > 1) {
                    this.selectedNodes.forEach(node => {
                        const nodeNewX = node.x + offsetX;
                        const nodeNewY = node.y + offsetY;
                        node.updatePosition(nodeNewX, nodeNewY);
                    });
                } else {
                    // 只移动单个节点
                    this.dragNode.updatePosition(newX, newY);
                }
                
                this.render();
            }
        }
        
        // 重置拖拽状态
        this.isDragging = false;
        this.dragNode = null;
        this.draggedNodes = null;
        this.alignmentGuides = [];
        this.spacingGuides = [];
        
        // 保存状态到历史记录
        this.saveState();
        
        // 移除事件监听器
        document.removeEventListener('mousemove', this.drag);
        document.removeEventListener('mouseup', this.stopDrag);
    }
    
    // 处理移动设备的触摸结束事件
    stopTouchDrag(e) {
        // 如果有正在拖拽的节点，尝试自动对齐和等间距调整
        if (this.dragNode) {
            // 计算总的偏移量
            let totalDeltaX = 0;
            let totalDeltaY = 0;
            
            // 在touchend事件中，使用changedTouches获取结束的触摸点
            if (e && e.changedTouches && e.changedTouches.length > 0) {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                totalDeltaX = endX - this.dragStartX;
                totalDeltaY = endY - this.dragStartY;
            }
            
            // 检测对齐和间距
            this.alignmentGuides = this.detectAlignment(this.dragNode);
            this.spacingGuides = this.detectEqualSpacing(this.dragNode);
            
            // 使用拖拽过程中已经检测到的对齐线和间距线，确保与显示的提示线一致
            const alignmentGuides = this.alignmentGuides;
            const spacingGuides = this.spacingGuides;
            
            // 计算新位置
            let newX = this.dragStartNodeX + totalDeltaX;
            let newY = this.dragStartNodeY + totalDeltaY;
            let hasSpacingGuide = false;
            
            // 优先应用等间距调整
            if (spacingGuides.length > 0) {
                // 取第一个等间距位置
                const spacingGuide = spacingGuides[0];
                // 根据间距提示线类型更新相应的坐标
                if (spacingGuide.type === 'horizontal') {
                    newX = spacingGuide.position;
                } else {
                    newY = spacingGuide.position;
                }
                hasSpacingGuide = true;
            }
            
            // 同时应用对齐调整（即使有间距线也会检查对齐）
            if (alignmentGuides.length > 0) {
                const verticalGuide = alignmentGuides.find(guide => guide.type === 'vertical'); // 垂直方向的线，用于水平对齐
                const horizontalGuide = alignmentGuides.find(guide => guide.type === 'horizontal'); // 水平方向的线，用于垂直对齐
                
                if (verticalGuide) {
                    // 根据对齐类型调整X坐标（垂直方向的线表示水平对齐）
                    const otherNode = this.nodes.find(n => n.id === verticalGuide.nodeId);
                    const otherBounds = this.getNodeBounds(otherNode);
                    
                    if (verticalGuide.axis === 'left') {
                        newX = otherBounds.left + this.dragNode.width / 2;
                    } else if (verticalGuide.axis === 'right') {
                        newX = otherBounds.right - this.dragNode.width / 2;
                    }
                }
                
                if (horizontalGuide) {
                    // 根据对齐类型调整Y坐标（水平方向的线表示垂直对齐）
                    const otherNode = this.nodes.find(n => n.id === horizontalGuide.nodeId);
                    const otherBounds = this.getNodeBounds(otherNode);
                    
                    if (horizontalGuide.axis === 'top') {
                        newY = otherBounds.top + this.dragNode.height / 2;
                    } else if (horizontalGuide.axis === 'bottom') {
                        newY = otherBounds.bottom - this.dragNode.height / 2;
                    } else if (horizontalGuide.axis === 'center') {
                        newY = otherNode.y;
                    }
                }
            }
            
            // 计算实际的偏移量
            const actualDeltaX = newX - this.dragStartNodeX;
            const actualDeltaY = newY - this.dragStartNodeY;
            
            // 更新所有选中的节点位置
            if (this.selectedNodes.length > 1) {
                this.selectedNodes.forEach(node => {
                    const nodeNewX = node.x + actualDeltaX;
                    const nodeNewY = node.y + actualDeltaY;
                    node.updatePosition(nodeNewX, nodeNewY);
                });
            } else {
                // 如果位置有变化，更新节点位置
                if (newX !== this.dragStartNodeX || newY !== this.dragStartNodeY) {
                    this.dragNode.updatePosition(newX, newY);
                }
            }
        }
        
        // 重置拖拽状态
        this.isDragging = false;
        this.dragNode = null;
        this.alignmentGuides = [];
        this.spacingGuides = [];
        
        // 移除will-change属性和transform
        if (this.draggedNodeElements) {
            Object.values(this.draggedNodeElements).forEach(draggedElement => {
                const element = draggedElement.element;
                element.style.willChange = '';
                element.style.transform = '';
            });
            this.draggedNodeElements = null;
        }
        
        // 保存状态到历史记录
        this.saveState();
        
        // 移除触摸事件监听器
        document.removeEventListener('touchmove', this.touchDrag);
        document.removeEventListener('touchend', this.stopTouchDrag);
        document.removeEventListener('touchcancel', this.stopTouchDrag);
        
        // 重新渲染
        this.render();
    }
    
    // 检测对齐
    detectAlignment(dragNode) {
        const dragBounds = dragNode.getNodeBounds();
        const alignmentGuides = [];
        const tolerance = 3; // 对齐容差（像素）- 提高精度
        
        // 检查与其他所有节点的对齐
        this.nodes.forEach(otherNode => {
            if (otherNode.id === dragNode.id) return;
            
            const otherBounds = otherNode.getNodeBounds();
            
            // 水平对齐检测（竖向对齐线）
            // 左对齐
            if (Math.abs(dragBounds.left - otherBounds.left) < tolerance) {
                alignmentGuides.push({
                    type: 'vertical',
                    position: dragBounds.left,
                    axis: 'left',
                    nodeId: otherNode.id
                });
            }
            // 右对齐
            if (Math.abs(dragBounds.right - otherBounds.right) < tolerance) {
                alignmentGuides.push({
                    type: 'vertical',
                    position: dragBounds.right,
                    axis: 'right',
                    nodeId: otherNode.id
                });
            }
            
            // 垂直对齐检测（仅保留中心对齐）
            // 垂直居中对齐 - 在移动设备上禁用，避免子节点被限制在相同坐标高度
            if (!this.isMobile && Math.abs(dragBounds.centerY - otherBounds.centerY) < tolerance) {
                alignmentGuides.push({
                    type: 'horizontal',
                    position: dragBounds.centerY,
                    axis: 'center',
                    nodeId: otherNode.id
                });
            }
        });
        
        // 去重：对于相同位置的对齐线，无论类型如何，只保留一个（最接近的位置）
        // 使用四舍五入处理浮点精度问题
        const uniqueGuides = [];
        const guideMap = new Map();
        
        // 为不同类型的对齐线设置优先级（数值越高，优先级越高）
        // 相同优先级的对齐线，保留先检测到的
        const axisPriority = {
            'left': 2,
            'right': 2
        };
        
        alignmentGuides.forEach(guide => {
            // 将位置四舍五入到最近的整数，避免浮点精度问题
            const roundedPosition = Math.round(guide.position);
            // 创建仅基于位置的key，确保同一位置只显示一条对齐线
            const positionKey = `${roundedPosition}`;
            
            if (!guideMap.has(positionKey)) {
                // 该位置没有对齐线，直接添加
                const uniqueGuide = {...guide, position: roundedPosition};
                guideMap.set(positionKey, uniqueGuide);
                uniqueGuides.push(uniqueGuide);
            } else {
                // 该位置已有对齐线，比较优先级
                const existingGuide = guideMap.get(positionKey);
                const existingPriority = axisPriority[existingGuide.axis] || 1;
                const currentPriority = axisPriority[guide.axis] || 1;
                
                if (currentPriority > existingPriority) {
                    // 当前对齐线优先级更高，替换现有对齐线
                    const uniqueGuide = {...guide, position: roundedPosition};
                    guideMap.set(positionKey, uniqueGuide);
                    // 更新uniqueGuides数组
                    const index = uniqueGuides.findIndex(g => 
                        Math.round(g.position) === roundedPosition
                    );
                    if (index !== -1) {
                        uniqueGuides[index] = uniqueGuide;
                    }
                }
            }
        });
        
        return uniqueGuides;
    }
    
    // 检测间距相等
    detectEqualSpacing(dragNode) {
        const dragBounds = dragNode.getNodeBounds();
        const spacingGuides = [];
        const spacingTolerance = 25; // 间距容差（像素）- 增大容差提高触发几率
        const alignmentTolerance = 30; // 对齐容差（像素）- 增大容差提高触发几率
        
        // 获取所有非拖动节点
        const otherNodes = [...this.nodes].filter(node => node.id !== dragNode.id);
        if (otherNodes.length < 2) return spacingGuides;
        
        // ============== 垂直等距检测 ==============
        // 按Y坐标排序
        const sortedByY = [...otherNodes].sort((a, b) => a.getNodeBounds().centerY - b.getNodeBounds().centerY);
        
        // 检查所有可能的节点对
        for (let i = 0; i < sortedByY.length; i++) {
            const nodeA = sortedByY[i];
            const nodeABounds = nodeA.getNodeBounds();
            
            for (let j = i + 1; j < sortedByY.length; j++) {
                const nodeB = sortedByY[j];
                const nodeBBounds = nodeB.getNodeBounds();
                
                // 不再要求节点必须水平对齐
                // 计算节点A和节点B之间的间距（垂直方向）
                const spacing = nodeBBounds.centerY - nodeABounds.centerY;
                
                // 计算可能的等间距位置
                // 1. 在节点A上方
                const aboveY = nodeABounds.centerY - spacing;
                if (Math.abs(dragBounds.centerY - aboveY) < spacingTolerance) {
                    spacingGuides.push({
                        type: 'vertical',
                        position: aboveY,
                        spacing: spacing,
                        prevNode: null,
                        currNode: nodeA,
                        isAbove: true
                    });
                }
                
                // 2. 在节点A和节点B之间
                const betweenY = (nodeABounds.centerY + nodeBBounds.centerY) / 2;
                if (Math.abs(dragBounds.centerY - betweenY) < spacingTolerance) {
                    spacingGuides.push({
                        type: 'vertical',
                        position: betweenY,
                        spacing: spacing,
                        prevNode: nodeA,
                        currNode: nodeB,
                        isBetween: true
                    });
                }
                
                // 3. 在节点B下方
                const belowY = nodeBBounds.centerY + spacing;
                if (Math.abs(dragBounds.centerY - belowY) < spacingTolerance) {
                    spacingGuides.push({
                        type: 'vertical',
                        position: belowY,
                        spacing: spacing,
                        prevNode: nodeB,
                        currNode: null,
                        isBelow: true
                    });
                }
            }
        }
        
        // 注释掉水平等距检测，不再显示水平方向的蓝色中线
        // ============== 水平等距检测 ==============
        // 按X坐标排序
        // const sortedByX = [...otherNodes].sort((a, b) => a.getNodeBounds().centerX - b.getNodeBounds().centerX);
        
        // 检查所有可能的节点对
        // for (let i = 0; i < sortedByX.length; i++) {
        //     const nodeA = sortedByX[i];
        //     const nodeABounds = nodeA.getNodeBounds();
        //     
        //     for (let j = i + 1; j < sortedByX.length; j++) {
        //         const nodeB = sortedByX[j];
        //         const nodeBBounds = nodeB.getNodeBounds();
        //         
        //         // 不再要求节点必须垂直对齐
        //         // 计算节点A和节点B之间的间距（水平方向）
        //         // 基于节点间连接线的X轴投影长度（连接线的水平距离）
        //         const spacing = Math.abs(nodeBBounds.centerX - nodeABounds.centerX);
        //         
        //         // 计算可能的等间距位置
        //         // 1. 在节点A左侧
        //         const leftX = nodeABounds.centerX - spacing;
        //         if (Math.abs(dragBounds.centerX - leftX) < spacingTolerance) {
        //             spacingGuides.push({
        //                 type: 'horizontal',
        //                 position: leftX,
        //                 spacing: spacing,
        //                 prevNode: null,
        //                 currNode: nodeA,
        //                 isLeft: true
        //             });
        //         }
        //         
        //         // 2. 在节点A和节点B之间
        //         const betweenX = (nodeABounds.centerX + nodeBBounds.centerX) / 2;
        //         if (Math.abs(dragBounds.centerX - betweenX) < spacingTolerance) {
        //             spacingGuides.push({
        //                 type: 'horizontal',
        //                 position: betweenX,
        //                 spacing: spacing,
        //                 prevNode: nodeA,
        //                 currNode: nodeB,
        //                 isBetween: true
        //             });
        //         }
        //         
        //         // 3. 在节点B右侧
        //         const rightX = nodeBBounds.centerX + spacing;
        //         if (Math.abs(dragBounds.centerX - rightX) < spacingTolerance) {
        //             spacingGuides.push({
        //                 type: 'horizontal',
        //                 position: rightX,
        //                 spacing: spacing,
        //                 prevNode: nodeB,
        //                 currNode: null,
        //                 isRight: true
        //             });
        //         }
        //     }
        // }
        
        // 去重：对于相同位置的间距线，无论类型如何，只保留一个
        // 使用四舍五入处理浮点精度问题
        const uniqueSpacingGuides = [];
        const spacingGuideMap = new Map();
        
        spacingGuides.forEach(guide => {
            // 将位置四舍五入到最近的整数，避免浮点精度问题
            const roundedPosition = Math.round(guide.position);
            // 创建仅基于位置的key，确保同一位置只显示一条间距线
            const key = `${roundedPosition}`;
            if (!spacingGuideMap.has(key)) {
                // 使用四舍五入后的位置创建唯一间距线
                const uniqueGuide = {...guide, position: roundedPosition};
                spacingGuideMap.set(key, uniqueGuide);
                uniqueSpacingGuides.push(uniqueGuide);
            }
        });
        
        return uniqueSpacingGuides;
    }
    
    // 渲染对齐和间距提示线
    renderGuides() {
        // 首先清除所有旧的对齐线和间距线
        const oldAlignmentGuides = this.canvas.querySelectorAll('.alignment-guide');
        oldAlignmentGuides.forEach(guide => this.canvas.removeChild(guide));
        
        const oldSpacingGuides = this.canvas.querySelectorAll('.spacing-guide');
        oldSpacingGuides.forEach(guide => this.canvas.removeChild(guide));
        
        if (!this.alignmentGuides && !this.spacingGuides) return;
        
        // 设置足够大的范围，确保对齐线能延伸到所有可能的节点位置
        const largeRange = 10000;
        
        // 渲染对齐提示线
        if (this.alignmentGuides && this.alignmentGuides.length > 0) {
            this.alignmentGuides.forEach(guide => {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                
                
                if (guide.type === 'horizontal') {
                    // 水平方向的线（用于垂直对齐）
                    line.setAttribute('x1', -largeRange + this.canvasOffsetX);
                    line.setAttribute('y1', guide.position + this.canvasOffsetY);
                    line.setAttribute('x2', largeRange + this.canvasOffsetX);
                    line.setAttribute('y2', guide.position + this.canvasOffsetY);
                    line.setAttribute('stroke', '#ff0000');
                    line.setAttribute('stroke-width', '1');
                    line.setAttribute('stroke-dasharray', '8,4');
                    line.setAttribute('opacity', '0.8');
                } else {
                    // 垂直方向的线（用于水平对齐）
                    line.setAttribute('x1', guide.position + this.canvasOffsetX);
                    line.setAttribute('y1', -largeRange + this.canvasOffsetY);
                    line.setAttribute('x2', guide.position + this.canvasOffsetX);
                    line.setAttribute('y2', largeRange + this.canvasOffsetY);
                    line.setAttribute('stroke', '#ff0000');
                    line.setAttribute('stroke-width', '1');
                    line.setAttribute('stroke-dasharray', '8,4');
                    line.setAttribute('opacity', '0.8');
                }
                
                line.setAttribute('class', 'alignment-guide');
                line.setAttribute('z-index', '1000');
                this.canvas.appendChild(line);
            });
        }
        
        // 渲染间距提示线
        if (this.spacingGuides && this.spacingGuides.length > 0) {
            this.spacingGuides.forEach(guide => {
                // 根据间距提示线类型绘制不同方向的线条
                const spacingLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                
                if (guide.type === 'horizontal') {
                    // 水平间距提示线（垂直方向的线）
                    spacingLine.setAttribute('x1', guide.position + this.canvasOffsetX);
                    spacingLine.setAttribute('y1', -largeRange + this.canvasOffsetY);
                    spacingLine.setAttribute('x2', guide.position + this.canvasOffsetX);
                    spacingLine.setAttribute('y2', largeRange + this.canvasOffsetY);
                } else {
                    // 垂直间距提示线（水平方向的线）
                    spacingLine.setAttribute('x1', -largeRange + this.canvasOffsetX);
                    spacingLine.setAttribute('y1', guide.position + this.canvasOffsetY);
                    spacingLine.setAttribute('x2', largeRange + this.canvasOffsetX);
                    spacingLine.setAttribute('y2', guide.position + this.canvasOffsetY);
                }
                
                spacingLine.setAttribute('stroke', '#0000ff');
                spacingLine.setAttribute('stroke-width', '1');
                spacingLine.setAttribute('stroke-dasharray', '8,4');
                spacingLine.setAttribute('opacity', '0.8');
                spacingLine.setAttribute('class', 'spacing-guide');
                spacingLine.setAttribute('z-index', '1000');
                this.canvas.appendChild(spacingLine);
                
                // 绘制参考点
                if (guide.prevNode && guide.currNode) {
                    // 绘制两个参考节点的中心点
                    const prevCenterX = guide.prevNode.getNodeBounds().centerX;
                    const prevCenterY = guide.prevNode.getNodeBounds().centerY;
                    const currCenterX = guide.currNode.getNodeBounds().centerX;
                    const currCenterY = guide.currNode.getNodeBounds().centerY;
                    
                    // 绘制prevNode的中心点标记
                    const prevCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    prevCircle.setAttribute('cx', prevCenterX + this.canvasOffsetX);
                    prevCircle.setAttribute('cy', prevCenterY + this.canvasOffsetY);
                    prevCircle.setAttribute('r', '4');
                    prevCircle.setAttribute('fill', '#0000ff');
                    prevCircle.setAttribute('opacity', '0.8');
                    prevCircle.setAttribute('class', 'spacing-guide');
                    prevCircle.setAttribute('z-index', '1001');
                    this.canvas.appendChild(prevCircle);
                    
                    // 绘制currNode的中心点标记
                    const currCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    currCircle.setAttribute('cx', currCenterX + this.canvasOffsetX);
                    currCircle.setAttribute('cy', currCenterY + this.canvasOffsetY);
                    currCircle.setAttribute('r', '4');
                    currCircle.setAttribute('fill', '#0000ff');
                    currCircle.setAttribute('opacity', '0.8');
                    currCircle.setAttribute('class', 'spacing-guide');
                    currCircle.setAttribute('z-index', '1001');
                    this.canvas.appendChild(currCircle);
                    
                    // 绘制连接线
                    const connectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    connectionLine.setAttribute('x1', prevCenterX + this.canvasOffsetX);
                    connectionLine.setAttribute('y1', prevCenterY + this.canvasOffsetY);
                    connectionLine.setAttribute('x2', currCenterX + this.canvasOffsetX);
                    connectionLine.setAttribute('y2', currCenterY + this.canvasOffsetY);
                    connectionLine.setAttribute('stroke', '#0000ff');
                    connectionLine.setAttribute('stroke-width', '2');
                    connectionLine.setAttribute('stroke-dasharray', '4,4');
                    connectionLine.setAttribute('opacity', '0.6');
                    connectionLine.setAttribute('class', 'spacing-guide');
                    connectionLine.setAttribute('z-index', '999');
                    this.canvas.appendChild(connectionLine);
                }
                
                // 绘制等间距位置的标记
                const guideCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                guideCircle.setAttribute('cx', 50 + this.canvasOffsetX); // 左侧固定位置显示标记
                guideCircle.setAttribute('cy', guide.position + this.canvasOffsetY);
                guideCircle.setAttribute('r', '6');
                guideCircle.setAttribute('fill', '#0000ff');
                guideCircle.setAttribute('opacity', '0.8');
                guideCircle.setAttribute('class', 'spacing-guide');
                guideCircle.setAttribute('z-index', '1001');
                this.canvas.appendChild(guideCircle);
                
                // 添加内圈
                const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                innerCircle.setAttribute('cx', 50 + this.canvasOffsetX);
                innerCircle.setAttribute('cy', guide.position + this.canvasOffsetY);
                innerCircle.setAttribute('r', '3');
                innerCircle.setAttribute('fill', '#ffffff');
                innerCircle.setAttribute('opacity', '0.9');
                innerCircle.setAttribute('class', 'spacing-guide');
                innerCircle.setAttribute('z-index', '1002');
                this.canvas.appendChild(innerCircle);
            });
        }
    }
    
    editNodeText(node) {
        console.log('editNodeText called for node:', node.id, node.text);
        
        // 如果有其他节点正在被编辑，先退出编辑状态并保存文本
        if (this.currentEditingNode && this.currentEditingNode !== node) {
            const currentNode = this.currentEditingNode;
            const currentNodeGroup = document.getElementById(`node-${currentNode.id}`);
            if (currentNodeGroup) {
                // 获取当前编辑的文本输入框
                const textarea = currentNodeGroup.querySelector('.edit-foreign-object textarea');
                
                // 保存当前编辑的文本
                if (textarea) {
                    const newText = textarea.value.trim();
                    this.updateNodeText(currentNode, newText);
                }
                
                // 隐藏当前编辑的foreignObject
                const currentEditFo = currentNodeGroup.querySelector('.edit-foreign-object');
                if (currentEditFo) {
                    currentEditFo.remove();
                }
                
                // 显示原始文本
                const originalForeignObjects = currentNodeGroup.querySelectorAll('foreignObject.node-text-foreign-object');
                originalForeignObjects.forEach(fo => {
                    fo.style.display = '';
                });
            }
        }
        
        // 选中节点，确保选中状态和横线正确显示
        this.selectNode(node);
        
        // 设置编辑状态为true
        this.isEditingNode = true;
        this.currentEditingNode = node;
        
        const nodeGroup = document.getElementById(`node-${node.id}`);
        if (!nodeGroup) {
            console.error('Node group not found:', `node-${node.id}`);
            return;
        }
        
        // 获取所有文本foreignObject并保存
        const originalForeignObjects = [];
        const foreignObjects = nodeGroup.querySelectorAll('foreignObject.node-text-foreign-object');
        foreignObjects.forEach(fo => {
            originalForeignObjects.push(fo);
            fo.style.display = 'none';
        });
        
        // 获取跑道形状元素
        const rectPath = nodeGroup.querySelector('path');
        
        // 创建文本输入foreignObject
        const textInput = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        textInput.setAttribute('x', node.x - node.width / 2 + 10);
        textInput.setAttribute('y', node.y - node.height / 2 + 10);
        textInput.setAttribute('width', node.width - 20);
        textInput.setAttribute('height', node.height - 20);
        textInput.setAttribute('class', 'edit-foreign-object');
        
        // 创建HTML文本区域元素
        const textarea = document.createElement('textarea');
        textarea.value = node.text;
        
        // 设置textarea样式 - 确保文本选择功能正常
        textarea.style.width = '100%';
        textarea.style.height = '100%';
        textarea.style.border = 'none';
        textarea.style.background = 'transparent';
        textarea.style.fontSize = `${node.style.fontSize}px`;
        textarea.style.fontFamily = node.style.fontFamily;
        textarea.style.color = node.style.fontColor;
        textarea.style.textAlign = 'left';
        textarea.style.outline = 'none';
        textarea.style.padding = '0';
        textarea.style.resize = 'none';
        textarea.style.overflow = 'hidden';
        textarea.style.whiteSpace = 'pre-wrap';
        textarea.style.wordWrap = 'break-word';
        textarea.style.lineHeight = '1.4';
        textarea.style.cursor = 'text';
        textarea.style.display = 'block';
        textarea.style.verticalAlign = 'top';
        
        // 明确允许文本选择
        textarea.style.userSelect = 'text';
        textarea.style.webkitUserSelect = 'text';
        textarea.style.mozUserSelect = 'text';
        textarea.style.msUserSelect = 'text';
        
        // 添加到foreignObject
        textInput.appendChild(textarea);
        
        // 保存原始文本
        const originalText = node.text;
        
        // 清理函数
        const cleanup = () => {
            this.isEditingNode = false;
            this.currentEditingNode = null;
            
            // 恢复原始文本显示
            originalForeignObjects.forEach(fo => {
                fo.style.display = '';
            });
            
            // 移除编辑元素
            if (nodeGroup.contains(textInput)) {
                nodeGroup.removeChild(textInput);
            }
        };
        
        // 处理编辑完成事件
        const finishEditing = () => {
            textarea.removeEventListener('keydown', handleKeyDown);
            textarea.removeEventListener('input', autoResize);
            
            // 移除全局事件监听器
            document.removeEventListener('mousedown', handleGlobalMouseDown);
            
            // 移除所有阻止冒泡的事件监听器
            eventsToPrevent.forEach(event => {
                nodeGroup.removeEventListener(event, preventBubble, true);
            });
            
            cleanup();
            
            // 更新节点文本
            const newText = textarea.value.trim();
            this.updateNodeText(node, newText);
        };
        
        // 处理键盘事件
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                
                textarea.removeEventListener('keydown', handleKeyDown);
                textarea.removeEventListener('input', autoResize);
                
                // 移除全局事件监听器
                document.removeEventListener('mousedown', handleGlobalMouseDown);
                
                // 移除所有阻止冒泡的事件监听器
                eventsToPrevent.forEach(event => {
                    nodeGroup.removeEventListener(event, preventBubble, true);
                });
                
                cleanup();
                
                // 保存当前输入的文本
                const newText = textarea.value.trim();
                this.updateNodeText(node, newText);
            }
        };
        
        // 自动调整文本区域和节点大小
        const autoResize = () => {
            // 调整textarea高度
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
            
            // 使用Canvas测量文本宽度
            const ctx = document.createElement('canvas').getContext('2d');
            ctx.font = `${node.style.fontSize}px ${node.style.fontFamily}`;
            
            const lines = textarea.value.split('\n');
            let maxLineWidth = 0;
            let totalHeight = 0;
            const lineHeight = parseInt(node.style.fontSize) * 1.4;
            const padding = 15; // 与calculateNodeSizes函数保持一致
            
            lines.forEach(line => {
                const lineWidth = ctx.measureText(line).width;
                maxLineWidth = Math.max(maxLineWidth, lineWidth);
                totalHeight += lineHeight;
            });
            
            // 记录节点的左侧端点位置
            const leftPosition = node.x - node.width / 2;
            
            // 更新节点大小，与calculateNodeSizes函数保持一致
            const newWidth = Math.max(maxLineWidth + padding * 2, 100);
            const newHeight = Math.max(totalHeight + padding * 2, 45);
            
            // 更新节点大小
            node.width = newWidth;
            node.height = newHeight;
            
            // 调整节点位置，使左侧端点保持不变
            node.x = leftPosition + newWidth / 2;
            
            // 更新foreignObject大小
            const textWidth = newWidth - 20;
            const textHeight = newHeight - 20;
            
            textInput.setAttribute('x', node.x - newWidth / 2 + 10);
            textInput.setAttribute('y', node.y - newHeight / 2 + 10);
            textInput.setAttribute('width', textWidth);
            textInput.setAttribute('height', textHeight);
            
            textarea.style.width = `${textWidth}px`;
            textarea.style.height = `${textHeight}px`;
            
            // 更新跑道形状
            if (rectPath) {
                const radius = node.height / 2;
                const x = node.x - node.width / 2;
                const y = node.y - node.height / 2;
                
                const pathData = [
                    `M${x + radius} ${y}`,
                    `L${x + node.width - radius} ${y}`,
                    `A${radius} ${radius} 0 0 1 ${x + node.width} ${y + radius}`,
                    `L${x + node.width} ${y + node.height - radius}`,
                    `A${radius} ${radius} 0 0 1 ${x + node.width - radius} ${y + node.height}`,
                    `L${x + radius} ${y + node.height}`,
                    `A${radius} ${radius} 0 0 1 ${x} ${y + node.height - radius}`,
                    `L${x} ${y + radius}`,
                    `A${radius} ${radius} 0 0 1 ${x + radius} ${y}`,
                    'Z'
                ].join(' ');
                
                rectPath.setAttribute('d', pathData);
            }
        };
        
        // 全局鼠标按下事件处理程序
        // 只在鼠标按下时检查是否点击了节点框外的区域
        const handleGlobalMouseDown = (e) => {
            // 检查点击目标是否在textarea内部
            if (e.target === textarea || textarea.contains(e.target)) {
                // 如果点击的是textarea内部，不做任何操作
                return;
            }
            
            // 检查点击目标是否在节点组内部
            if (nodeGroup.contains(e.target)) {
                // 如果点击的是节点组内部（但不是textarea），不做任何操作
                return;
            }
            
            // 检查是否有其他编辑区域
            const otherEditArea = e.target.closest('.edit-foreign-object');
            if (otherEditArea) {
                // 如果点击的是其他编辑区域，不做任何操作
                return;
            }
            
            // 如果点击的是节点框外的区域，退出编辑模式
            finishEditing();
        };
        
        // 在编辑模式下，阻止节点组的所有事件冒泡
        // 这样可以确保文本选择操作不会被其他事件处理程序干扰
        const preventBubble = (e) => {
            e.stopPropagation();
        };
        
        // 为节点组添加所有可能的事件监听器，阻止事件冒泡
        const eventsToPrevent = ['click', 'mousedown', 'mouseup', 'mousemove', 'dblclick', 'touchstart', 'touchmove', 'touchend'];
        eventsToPrevent.forEach(event => {
            nodeGroup.addEventListener(event, preventBubble, true);
        });
        
        // 添加事件监听器
        textarea.addEventListener('keydown', handleKeyDown);
        textarea.addEventListener('input', autoResize);
        
        // 添加全局鼠标按下事件监听器
        // 使用mousedown而不是click，避免与文本选择冲突
        document.addEventListener('mousedown', handleGlobalMouseDown);
        
        // 添加编辑元素到节点组
        nodeGroup.appendChild(textInput);
        
        // 聚焦文本框 - 允许光标选择
        setTimeout(() => {
            try {
                textarea.focus();
                // 不自动全选，让用户可以直接选择文本
                textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
                autoResize();
            } catch (e) {
                console.error('Focus error:', e);
                cleanup();
            }
        }, 100);
    }
    
    addChildNode(parentNode = null) {
        const parent = parentNode || this.selectedNode || this.rootNode;
        
        if (!parent) return;
        
        // 计算新节点位置
        // 根据节点实际尺寸计算合适的距离，保持美观
        const spacing = 50; // 节点之间的间距
        const estimatedNodeHeight = 50; // 估计的新节点高度
        const estimatedNodeWidth = 100; // 估计的新节点宽度
        
        let newX, newY;
        
        if (parent.children.length === 0) {
            // 第一个子节点，放在父节点右侧，距离为默认节点宽度的3倍
            newX = parent.x + parent.width / 2 + estimatedNodeWidth * 3 + estimatedNodeWidth / 2;
            newY = parent.y; // 与父节点保持同一水平中心线
        } else {
            // 不是第一个子节点，找到最下方的子节点，在其下方添加
            const bottommostChild = parent.children.reduce((bottommost, child) => {
                const bottommostBounds = bottommost.getNodeBounds();
                const childBounds = child.getNodeBounds();
                return (childBounds.bottom > bottommostBounds.bottom) ? child : bottommost;
            }, parent.children[0]); // 提供初始值
            
            const bottommostBounds = bottommostChild.getNodeBounds();
            newX = bottommostChild.x; // 与最下方子节点保持同一垂直线
            newY = bottommostBounds.bottom + spacing + estimatedNodeHeight / 2;
        }
        
        // 创建空节点
        const newNode = this.createNode('', newX, newY, parent);
        // 保持选中原节点（父节点）
        this.selectedNode = parent;
        this.selectedNodes = [parent];
        this.updateStylePanel();
        this.render();
    }
    
    updateStylePanel() {
        if (this.selectedNodes.length === 0) {
            // 禁用样式面板
            document.getElementById('nodeColor').disabled = true;
            document.getElementById('borderColor').disabled = true;
            document.getElementById('fontColor').disabled = true;
            document.getElementById('fontSize').disabled = true;
            document.getElementById('fontFamily').disabled = true;
            return;
        }
        
        // 启用样式面板
        document.getElementById('nodeColor').disabled = false;
        document.getElementById('borderColor').disabled = false;
        document.getElementById('fontColor').disabled = false;
        document.getElementById('fontSize').disabled = false;
        document.getElementById('fontFamily').disabled = false;
        
        if (this.selectedNodes.length === 1) {
            // 单个节点选中，显示该节点的样式
            const node = this.selectedNodes[0];
            document.getElementById('nodeColor').value = node.style.nodeColor;
            document.getElementById('borderColor').value = node.style.borderColor;
            document.getElementById('fontColor').value = node.style.fontColor;
            document.getElementById('fontSize').value = node.style.fontSize;
            document.getElementById('fontFamily').value = node.style.fontFamily;
        } else {
            // 多个节点选中，检查是否所有节点的样式属性相同
            // 节点颜色
            const nodeColors = new Set(this.selectedNodes.map(node => node.style.nodeColor));
            if (nodeColors.size === 1) {
                document.getElementById('nodeColor').value = this.selectedNodes[0].style.nodeColor;
            } else {
                // 如果颜色不同，不设置值（保持当前值或默认值）
                // 这里可以选择显示空值或第一个节点的值
                document.getElementById('nodeColor').value = this.selectedNodes[0].style.nodeColor;
            }
            
            // 边框颜色
            const borderColors = new Set(this.selectedNodes.map(node => node.style.borderColor));
            if (borderColors.size === 1) {
                document.getElementById('borderColor').value = this.selectedNodes[0].style.borderColor;
            } else {
                document.getElementById('borderColor').value = this.selectedNodes[0].style.borderColor;
            }
            
            // 字体颜色
            const fontColors = new Set(this.selectedNodes.map(node => node.style.fontColor));
            if (fontColors.size === 1) {
                document.getElementById('fontColor').value = this.selectedNodes[0].style.fontColor;
            } else {
                document.getElementById('fontColor').value = this.selectedNodes[0].style.fontColor;
            }
            
            // 字体大小
            const fontSizes = new Set(this.selectedNodes.map(node => node.style.fontSize));
            if (fontSizes.size === 1) {
                document.getElementById('fontSize').value = this.selectedNodes[0].style.fontSize;
            } else {
                document.getElementById('fontSize').value = this.selectedNodes[0].style.fontSize;
            }
            
            // 字体
            const fontFamilies = new Set(this.selectedNodes.map(node => node.style.fontFamily));
            if (fontFamilies.size === 1) {
                document.getElementById('fontFamily').value = this.selectedNodes[0].style.fontFamily;
            } else {
                document.getElementById('fontFamily').value = this.selectedNodes[0].style.fontFamily;
            }
        }
    }
    
    updateNodeStyle() {
        if (this.selectedNodes.length === 0) return;
        
        // 保存状态到历史记录
        this.saveState();
        
        const newStyle = {
            nodeColor: document.getElementById('nodeColor').value,
            borderColor: document.getElementById('borderColor').value,
            fontColor: document.getElementById('fontColor').value,
            fontSize: parseInt(document.getElementById('fontSize').value),
            fontFamily: document.getElementById('fontFamily').value
        };
        
        // 保存每个选中节点的左侧端点位置
        const leftPositions = new Map();
        this.selectedNodes.forEach(node => {
            const leftPosition = node.x - node.width / 2;
            leftPositions.set(node.id, leftPosition);
        });
        
        // 为所有选中的节点应用相同的样式
        this.selectedNodes.forEach(node => {
            node.updateStyle(newStyle);
        });
        
        // 重新计算节点尺寸
        this.calculateNodeSizes();
        
        // 调整节点位置，使左侧端点保持不变
        this.selectedNodes.forEach(node => {
            // 获取保存的左侧端点位置
            const leftPosition = leftPositions.get(node.id);
            
            // 计算节点中心点的新位置，使左侧端点保持不变
            const newWidth = node.width;
            const newX = leftPosition + newWidth / 2;
            
            // 更新节点位置
            node.x = newX;
        });
        
        this.render();
    }
    
    // 更新连接线颜色
    updateConnectionColor() {
        // 保存状态到历史记录
        this.saveState();
        
        // 更新连接线颜色
        this.connectionColor = document.getElementById('connectionColor').value;
        
        // 重新渲染画布
        this.render();
    }
    
    saveMap(format = null, fileName = null) {
        try {
            // 获取用户选择的保存格式
            const saveFormat = format || 'svg';
            
            let content, mimeType, finalFileName;
            
            switch (saveFormat) {
                case 'json':
                    // 准备保存的数据，避免循环引用
                    const mapData = {
                        nodes: this.nodes.map(node => ({
                            id: node.id,
                            text: node.text,
                            x: node.x,
                            y: node.y,
                            style: node.style,
                            isReverseConnection: node.isReverseConnection,
                            width: node.width,
                            height: node.height,
                            // 只保存父节点ID，避免循环引用
                            parents: node.parents.map(parent => ({ id: parent.id }))
                        })),
                        nextNodeId: this.nextNodeId
                    };
                    
                    content = JSON.stringify(mapData, null, 2);
                    mimeType = 'application/json';
                    finalFileName = fileName ? `${fileName}.json` : 'mindmap.json';
                    break;
                    
                case 'svg':
                    // 创建canvas的副本，避免修改原始内容
                    const tempCanvas = this.canvas.cloneNode(true);
                    
                    // 遍历所有节点
                    this.nodes.forEach(node => {
                        // 找到节点组
                        const nodeGroup = tempCanvas.querySelector(`#node-${node.id}`);
                        if (nodeGroup) {
                            // 移除所有可能的点击区域半圆
                            const allPaths = nodeGroup.querySelectorAll('path');
                            allPaths.forEach(path => {
                                // 检查是否是半圆点击区域
                                if (path.classList.contains('left-semicircle') || path.classList.contains('right-semicircle')) {
                                    path.remove();
                                }
                            });
                            
                            // 替换foreignObject为SVG text元素
                            const foreignObjects = nodeGroup.querySelectorAll('.node-text-foreign-object');
                            foreignObjects.forEach(fo => {
                                // 创建SVG text元素
                                const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                                
                                // 直接使用节点的中心位置作为文本位置
                                textElement.setAttribute('x', node.x);
                                textElement.setAttribute('y', node.y);
                                textElement.setAttribute('text-anchor', 'middle');
                                textElement.setAttribute('dominant-baseline', 'middle');
                                
                                // 应用样式（确保所有样式都被正确应用）
                                textElement.setAttribute('fill', node.style.fontColor || '#000000');
                                textElement.setAttribute('font-size', `${node.style.fontSize || 14}px`);
                                textElement.setAttribute('font-family', node.style.fontFamily || 'Arial, sans-serif');
                                textElement.setAttribute('line-height', '1.4');
                                
                                // 处理多行文本
                                const lines = node.text.split('\n');
                                const fontSize = parseFloat(node.style.fontSize || 14);
                                const lineHeight = fontSize * 1.4;
                                const totalTextHeight = lines.length * lineHeight;
                                const yOffset = -totalTextHeight / 2 + lineHeight / 2;
                                
                                // 确保创建的tspan元素正确应用样式和位置
                                lines.forEach((line, index) => {
                                    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                                    tspan.setAttribute('x', node.x);
                                    tspan.setAttribute('y', node.y + yOffset + index * lineHeight);
                                    tspan.textContent = line;
                                    // 确保tspan继承文本元素的样式
                                    tspan.setAttribute('fill', node.style.fontColor || '#000000');
                                    tspan.setAttribute('font-size', `${fontSize}px`);
                                    tspan.setAttribute('font-family', node.style.fontFamily || 'Arial, sans-serif');
                                    textElement.appendChild(tspan);
                                });
                                
                                // 替换foreignObject
                                fo.replaceWith(textElement);
                            });
                            
                            // 确保节点路径应用了正确的样式
                            const nodePath = nodeGroup.querySelector('path');
                            if (nodePath) {
                                // 确保路径样式与节点当前样式完全一致
                                nodePath.setAttribute('fill', node.style.nodeColor || '#ffffff');
                                nodePath.setAttribute('stroke', node.style.borderColor || '#000000');
                                nodePath.setAttribute('stroke-width', '2');
                                // 确保路径没有被错误地应用了其他样式
                                nodePath.removeAttribute('stroke-dasharray');
                                nodePath.removeAttribute('opacity');
                            }
                            
                            // 移除画布平移转换
                            nodeGroup.removeAttribute('transform');
                        }
                    });
                    
                    // 确保连接线（曲线）的颜色正确并修正坐标
                    const connections = tempCanvas.querySelectorAll('.connection');
                    connections.forEach(connection => {
                        // 修正坐标：移除canvasOffsetX和canvasOffsetY
                        let path = connection.getAttribute('d');
                        
                        // 使用更健壮的路径解析方法
                        const pathData = path.match(/([MLC])([^MLC]*)/gi) || [];
                        let newPath = '';
                        
                        pathData.forEach(segment => {
                            const cmd = segment.charAt(0);
                            const coords = segment.slice(1).trim();
                            
                            if (coords) {
                                const coordPairs = coords.match(/([\d.-]+)\s+([\d.-]+)/gi) || [];
                                newPath += cmd;
                                
                                coordPairs.forEach(pair => {
                                    const [x, y] = pair.split(/\s+/).map(Number);
                                    // 减去偏移量，保留两位小数以提高精度
                                    const newX = (x - this.canvasOffsetX).toFixed(2);
                                    const newY = (y - this.canvasOffsetY).toFixed(2);
                                    newPath += ` ${newX} ${newY}`;
                                });
                                
                                newPath += ' ';
                            } else {
                                newPath += cmd + ' ';
                            }
                        });
                        
                        connection.setAttribute('d', newPath.trim());
                        connection.setAttribute('stroke', this.connectionColor);
                        connection.setAttribute('stroke-width', '2');
                        connection.setAttribute('fill', 'none');
                        
                        // 确保连接线属性正确
                        connection.setAttribute('class', 'connection');
                    });
                    
                    // 确保箭头的颜色正确并修正坐标
                    const arrows = tempCanvas.querySelectorAll('.arrow');
                    arrows.forEach(arrow => {
                        // 修正坐标：移除canvasOffsetX和canvasOffsetY
                        let path = arrow.getAttribute('d');
                        
                        // 使用更健壮的路径解析方法
                        const pathData = path.match(/([MLZ])([^MLZ]*)/gi) || [];
                        let newPath = '';
                        
                        pathData.forEach(segment => {
                            const cmd = segment.charAt(0);
                            const coords = segment.slice(1).trim();
                            
                            if (coords) {
                                const coordPairs = coords.match(/([\d.-]+)\s+([\d.-]+)/gi) || [];
                                newPath += cmd;
                                
                                coordPairs.forEach(pair => {
                                    const [x, y] = pair.split(/\s+/).map(Number);
                                    // 减去偏移量，保留两位小数以提高精度
                                    const newX = (x - this.canvasOffsetX).toFixed(2);
                                    const newY = (y - this.canvasOffsetY).toFixed(2);
                                    newPath += ` ${newX} ${newY}`;
                                });
                                
                                newPath += ' ';
                            } else {
                                newPath += cmd + ' ';
                            }
                        });
                        
                        arrow.setAttribute('d', newPath.trim());
                        arrow.setAttribute('fill', this.connectionColor);
                        arrow.setAttribute('stroke', this.connectionColor);
                        arrow.setAttribute('stroke-width', '1');
                        
                        // 确保箭头属性正确
                        arrow.setAttribute('class', 'arrow');
                    });
                    
                    // 计算所有节点的边界框，用于设置SVG的导出区域
                    const boundingBox = this.calculateNodesBoundingBox();
                    
                    // 添加适当的边距
                    const margin = 20;
                    const viewBoxX = boundingBox.minX - margin;
                    const viewBoxY = boundingBox.minY - margin;
                    const viewBoxWidth = boundingBox.width + 2 * margin;
                    const viewBoxHeight = boundingBox.height + 2 * margin;
                    
                    // 设置SVG的viewBox和尺寸，确保包含所有节点并具有适当边距
                    tempCanvas.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
                    tempCanvas.setAttribute('width', `${viewBoxWidth}px`);
                    tempCanvas.setAttribute('height', `${viewBoxHeight}px`);
                    // 保持preserveAspectRatio为xMidYMid meet，确保内容不会被拉伸
                    tempCanvas.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                    
                    // 移除画布平移，确保内容在新的viewBox中正确显示
                    tempCanvas.style.transform = 'none';
                    tempCanvas.style.left = '0';
                    tempCanvas.style.top = '0';
                    
                    // 添加样式元素
                    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
                    styleElement.textContent = `
                        .node path { stroke-width: 2px; }
                        .node text { pointer-events: none; }
                        .connection { fill: none; stroke-width: 2px; }
                        .arrow { stroke-width: 1px; }
                    `;
                    tempCanvas.insertBefore(styleElement, tempCanvas.firstChild);
                    
                    // 使用XMLSerializer确保正确序列化
                    const serializer = new XMLSerializer();
                    let svgContent = serializer.serializeToString(tempCanvas);
                    
                    // 添加XML声明
                    svgContent = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' + svgContent;
                    
                    // 确保SVG命名空间正确
                    if (!svgContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
                        svgContent = svgContent.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                    }
                    
                    // 确保所有样式都正确应用
                    content = svgContent;
                    mimeType = 'image/svg+xml';
                    finalFileName = fileName ? `${fileName}.svg` : 'mindmap.svg';
                    break;
                    
                case 'png':
                    // 创建canvas的副本，避免修改原始内容
                    const tempPngCanvas = this.canvas.cloneNode(true);
                    
                    // 遍历所有节点
                    this.nodes.forEach(node => {
                        // 找到节点组
                        const nodeGroup = tempPngCanvas.querySelector(`#node-${node.id}`);
                        if (nodeGroup) {
                            // 移除所有可能的点击区域半圆
                            const allPaths = nodeGroup.querySelectorAll('path');
                            allPaths.forEach(path => {
                                // 检查是否是半圆点击区域
                                if (path.classList.contains('left-semicircle') || path.classList.contains('right-semicircle')) {
                                    path.remove();
                                }
                            });
                            
                            // 替换foreignObject为SVG text元素，避免Canvas被污染
                            const foreignObjects = nodeGroup.querySelectorAll('.node-text-foreign-object');
                            foreignObjects.forEach(fo => {
                                // 创建SVG text元素
                                const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                                
                                // 直接使用节点的中心位置作为文本位置
                                textElement.setAttribute('x', node.x); // 文本水平中心与节点中心一致
                                textElement.setAttribute('y', node.y); // 文本垂直中心与节点中心一致
                                textElement.setAttribute('text-anchor', 'middle');
                                textElement.setAttribute('dominant-baseline', 'middle');
                                
                                // 应用样式（确保所有样式都被正确应用）
                                textElement.setAttribute('fill', node.style.fontColor || '#000000');
                                textElement.setAttribute('font-size', `${node.style.fontSize || 14}px`);
                                textElement.setAttribute('font-family', node.style.fontFamily || 'Arial, sans-serif');
                                textElement.setAttribute('line-height', '1.4');
                                
                                // 处理多行文本
                                const lines = node.text.split('\n');
                                const fontSize = parseFloat(node.style.fontSize || 14);
                                const lineHeight = fontSize * 1.4;
                                const totalTextHeight = lines.length * lineHeight;
                                const yOffset = -totalTextHeight / 2 + lineHeight / 2;
                                
                                // 确保创建的tspan元素正确应用样式和位置
                                lines.forEach((line, index) => {
                                    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                                    tspan.setAttribute('x', node.x); // 确保每行都居中
                                    tspan.setAttribute('y', node.y + yOffset + index * lineHeight);
                                    tspan.textContent = line;
                                    // 确保tspan继承文本元素的样式
                                    tspan.setAttribute('fill', node.style.fontColor || '#000000');
                                    tspan.setAttribute('font-size', `${fontSize}px`);
                                    tspan.setAttribute('font-family', node.style.fontFamily || 'Arial, sans-serif');
                                    textElement.appendChild(tspan);
                                });
                                
                                // 替换foreignObject
                                fo.replaceWith(textElement);
                            });
                            
                            // 确保节点路径应用了正确的样式
                            const nodePath = nodeGroup.querySelector('path');
                            if (nodePath) {
                                // 确保路径样式与节点当前样式完全一致
                                nodePath.setAttribute('fill', node.style.nodeColor || '#ffffff');
                                nodePath.setAttribute('stroke', node.style.borderColor || '#000000');
                                nodePath.setAttribute('stroke-width', '2');
                                // 确保路径没有被错误地应用了其他样式
                                nodePath.removeAttribute('stroke-dasharray');
                                nodePath.removeAttribute('opacity');
                            }
                            
                            // 移除画布平移转换
                            nodeGroup.removeAttribute('transform');
                        }
                    });
                    
                    // 确保连接线（曲线）的颜色正确并修正坐标
                    const pngConnections = tempPngCanvas.querySelectorAll('.connection');
                    pngConnections.forEach(connection => {
                        // 修正坐标：移除canvasOffsetX和canvasOffsetY
                        let path = connection.getAttribute('d');
                        
                        // 使用更健壮的路径解析方法
                        const pathData = path.match(/([MLC])([^MLC]*)/gi) || [];
                        let newPath = '';
                        
                        pathData.forEach(segment => {
                            const cmd = segment.charAt(0);
                            const coords = segment.slice(1).trim();
                            
                            if (coords) {
                                const coordPairs = coords.match(/([\d.-]+)\s+([\d.-]+)/gi) || [];
                                newPath += cmd;
                                
                                coordPairs.forEach(pair => {
                                    const [x, y] = pair.split(/\s+/).map(Number);
                                    // 减去偏移量，保留两位小数以提高精度
                                    const newX = (x - this.canvasOffsetX).toFixed(2);
                                    const newY = (y - this.canvasOffsetY).toFixed(2);
                                    newPath += ` ${newX} ${newY}`;
                                });
                                
                                newPath += ' ';
                            } else {
                                newPath += cmd + ' ';
                            }
                        });
                        
                        connection.setAttribute('d', newPath.trim());
                        connection.setAttribute('stroke', this.connectionColor);
                        connection.setAttribute('stroke-width', '2');
                        connection.setAttribute('fill', 'none');
                    });
                    
                    // 确保箭头的颜色正确并修正坐标
                    const pngArrows = tempPngCanvas.querySelectorAll('.arrow');
                    pngArrows.forEach(arrow => {
                        // 修正坐标：移除canvasOffsetX和canvasOffsetY
                        let path = arrow.getAttribute('d');
                        
                        // 使用更健壮的路径解析方法
                        const pathData = path.match(/([MLZ])([^MLZ]*)/gi) || [];
                        let newPath = '';
                        
                        pathData.forEach(segment => {
                            const cmd = segment.charAt(0);
                            const coords = segment.slice(1).trim();
                            
                            if (coords) {
                                const coordPairs = coords.match(/([\d.-]+)\s+([\d.-]+)/gi) || [];
                                newPath += cmd;
                                
                                coordPairs.forEach(pair => {
                                    const [x, y] = pair.split(/\s+/).map(Number);
                                    // 减去偏移量，保留两位小数以提高精度
                                    const newX = (x - this.canvasOffsetX).toFixed(2);
                                    const newY = (y - this.canvasOffsetY).toFixed(2);
                                    newPath += ` ${newX} ${newY}`;
                                });
                                
                                newPath += ' ';
                            } else {
                                newPath += cmd + ' ';
                            }
                        });
                        
                        arrow.setAttribute('d', newPath.trim());
                        arrow.setAttribute('fill', this.connectionColor);
                        arrow.setAttribute('stroke', this.connectionColor);
                        arrow.setAttribute('stroke-width', '1');
                    });
                    
                    // 计算所有节点的边界框，用于设置SVG的导出区域
                    const pngBoundingBox = this.calculateNodesBoundingBox();
                    
                    // 添加适当的边距
                    const pngMargin = 20;
                    const pngViewBoxX = pngBoundingBox.minX - pngMargin;
                    const pngViewBoxY = pngBoundingBox.minY - pngMargin;
                    const pngViewBoxWidth = pngBoundingBox.width + 2 * pngMargin;
                    const pngViewBoxHeight = pngBoundingBox.height + 2 * pngMargin;
                    
                    // 设置SVG的viewBox和尺寸，确保包含所有节点并具有适当边距
                    tempPngCanvas.setAttribute('viewBox', `${pngViewBoxX} ${pngViewBoxY} ${pngViewBoxWidth} ${pngViewBoxHeight}`);
                    tempPngCanvas.setAttribute('width', `${pngViewBoxWidth}px`);
                    tempPngCanvas.setAttribute('height', `${pngViewBoxHeight}px`);
                    // 保持preserveAspectRatio为xMidYMid meet，确保内容不会被拉伸
                    tempPngCanvas.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                    
                    // 添加样式元素
                    const pngStyleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
                    pngStyleElement.textContent = `
                        .node path { stroke-width: 2px; }
                        .node text { pointer-events: none; }
                        .connection { fill: none; stroke-width: 2px; }
                        .arrow { stroke-width: 1px; }
                    `;
                    tempPngCanvas.insertBefore(pngStyleElement, tempPngCanvas.firstChild);
                    
                    // 移除画布平移，确保内容在新的viewBox中正确显示
                    tempPngCanvas.style.transform = 'none';
                    tempPngCanvas.style.left = '0';
                    tempPngCanvas.style.top = '0';
                    
                    // 添加到DOM临时元素，确保所有样式都能正确计算
                    document.body.appendChild(tempPngCanvas);
                    
                    // 将修改后的SVG转换为PNG
                    const svgData = new XMLSerializer().serializeToString(tempPngCanvas);
                    
                    // 从DOM中移除临时元素
                    document.body.removeChild(tempPngCanvas);
                    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                    const svgUrl = URL.createObjectURL(svgBlob);
                    
                    // 创建一个临时的Image对象来绘制PNG
                    const img = new Image();
                    img.crossOrigin = 'anonymous'; // 设置crossOrigin属性，避免Canvas被污染
                    img.onload = () => {
                        // 创建一个Canvas对象
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // 提高分辨率倍数，值越大图像越清晰但文件越大
                        const resolution = 2;
                        
                        // 设置Canvas大小为包含边距的完整尺寸乘以分辨率倍数
                        canvas.width = pngViewBoxWidth * resolution;
                        canvas.height = pngViewBoxHeight * resolution;
                        
                        // 设置缩放因子
                        ctx.scale(resolution, resolution);
                        
                        // 绘制SVG内容到Canvas
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, pngViewBoxWidth, pngViewBoxHeight);
                        ctx.drawImage(img, 0, 0, pngViewBoxWidth, pngViewBoxHeight);
                        
                        // 将Canvas内容转换为PNG
                        try {
                            // 使用toDataURL代替toBlob，避免tainted canvas错误
                            const dataURL = canvas.toDataURL('image/png');
                            
                            // 创建下载链接
                            const a = document.createElement('a');
                            a.href = dataURL;
                            a.download = fileName ? `${fileName}.png` : 'mindmap.png';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        } catch (error) {
                            console.error('PNG导出失败:', error);
                            alert('PNG导出失败，Canvas被污染。请尝试导出为SVG格式，SVG格式更可靠且是矢量图形，质量更高。');
                        }
                        
                        // 清理
                        URL.revokeObjectURL(svgUrl);
                    };
                    
                    img.src = svgUrl;
                    return; // 异步处理，直接返回
                    
                case 'markdown':
                    // 生成Markdown格式
                    content = this.generateMarkdown();
                    mimeType = 'text/markdown';
                    finalFileName = fileName ? `${fileName}.md` : 'mindmap.md';
                    break;
                    
                default:
                    throw new Error('不支持的保存格式');
            }
            
            // 创建Blob对象并下载（适用于JSON、SVG和Markdown格式）
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = finalFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('保存思维导图失败:', error);
            alert('保存思维导图失败，请检查控制台获取详细信息。');
        }
    }
    
    // 生成Markdown格式的思维导图内容
    generateMarkdown() {
        // 找到所有根节点（没有父节点的节点）
        const rootNodes = this.nodes.filter(node => node.parents.length === 0);
        
        if (rootNodes.length === 0) {
            return '# 思维导图\n\n没有节点数据';
        }
        
        // 递归生成Markdown内容
        const generateNodeMarkdown = (node, level = 0) => {
            const indent = '  '.repeat(level);
            let markdown = `${indent}- ${node.text}\n`;
            
            // 找到所有子节点
            const children = this.nodes.filter(n => 
                n.parents.some(parent => parent.id === node.id)
            );
            
            // 递归处理子节点
            children.forEach(child => {
                markdown += generateNodeMarkdown(child, level + 1);
            });
            
            return markdown;
        };
        
        // 生成Markdown内容
        let markdown = '# 思维导图\n\n';
        rootNodes.forEach(root => {
            markdown += generateNodeMarkdown(root);
        });
        
        return markdown;
    }
    
    loadMap() {
        // 创建文件选择对话框
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    // 处理JSON格式
                    const mapData = JSON.parse(event.target.result);
                    
                    // 清空现有数据
                    this.nodes = [];
                    this.connections = [];
                    this.selectedNode = null;
                    
                    // 重建节点
                    const nodeMap = new Map();
                    
                    mapData.nodes.forEach(nodeData => {
                        const node = new Node(
                            nodeData.id,
                            nodeData.text,
                            nodeData.x,
                            nodeData.y
                        );
                        
                        node.style = nodeData.style;
                        node.isReverseConnection = nodeData.isReverseConnection || false;
                        node.width = nodeData.width;
                        node.height = nodeData.height;
                        
                        this.nodes.push(node);
                        nodeMap.set(node.id, node);
                        
                        if (node.id === 1) {
                            this.rootNode = node;
                        }
                    });
                    
                    // 重建父子关系
                    this.nodes.forEach(node => {
                        const originalNode = mapData.nodes.find(n => n.id === node.id);
                        if (originalNode) {
                            // 处理多个父节点
                            if (originalNode.parents && Array.isArray(originalNode.parents)) {
                                originalNode.parents.forEach(parentData => {
                                    if (parentData && parentData.id) {
                                        const parentNode = nodeMap.get(parentData.id);
                                        if (parentNode) {
                                            parentNode.addChild(node);
                                        }
                                    }
                                });
                            } else if (originalNode.parent) {
                                // 兼容旧数据格式（单个父节点）
                                const parentNode = nodeMap.get(originalNode.parent.id);
                                if (parentNode) {
                                    parentNode.addChild(node);
                                }
                            }
                        }
                    });
                    
                    this.nextNodeId = mapData.nextNodeId;
                    this.render();
                    

                } catch (error) {
                    console.error('加载思维导图失败:', error);
                    alert('加载思维导图失败，请检查文件格式是否正确。');
                }
            };
            
            reader.onerror = () => {
                console.error('文件读取失败');
                alert('文件读取失败，请重试。');
            };
            
            reader.readAsText(file);
        };
        
        // 触发文件选择对话框
        input.click();
    }

    loadSvgMap(svgContent) {
        // 清空现有数据
        this.nodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.nextNodeId = 1;

        // 创建临时DOM元素来解析SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');
        if (!svgElement) {
            throw new Error('无效的SVG文件');
        }

        // 获取SVG的viewBox信息，用于坐标转换
        const viewBox = svgElement.getAttribute('viewBox');
        let viewBoxX = 0, viewBoxY = 0, viewBoxWidth = 0, viewBoxHeight = 0;
        if (viewBox) {
            [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = viewBox.split(/\s+/).map(Number);
        }

        // 获取SVG的实际尺寸
        const svgWidth = parseInt(svgElement.getAttribute('width')) || viewBoxWidth || 800;
        const svgHeight = parseInt(svgElement.getAttribute('height')) || viewBoxHeight || 600;

        // 解析节点
        const nodeMap = new Map();
        const nodeGroups = svgElement.querySelectorAll('.node');

        nodeGroups.forEach((nodeElement, index) => {
            let centerX, centerY, width, height;
            
            // 从文本元素获取节点中心位置
            const textElement = nodeElement.querySelector('text');
            if (textElement) {
                centerX = parseFloat(textElement.getAttribute('x'));
                centerY = parseFloat(textElement.getAttribute('y'));
            } else {
                // 如果没有文本元素，使用默认位置
                centerX = index * 200;
                centerY = 100;
            }
            
            // 从path元素或rect元素获取尺寸
            const path = nodeElement.querySelector('path');
            const rect = nodeElement.querySelector('rect');
            
            if (path) {
                // 从path的d属性计算尺寸（假设是椭圆或圆角矩形）
                const d = path.getAttribute('d');
                if (d) {
                    // 尝试从路径数据中提取边界框
                    // 对于 "M x1 y1 L x2 y1 A r r 0 0 1 x2 y2 L x1 y2 A r r 0 0 1 x1 y1 Z" 格式的路径
                    const coords = d.match(/\d+\.?\d*/g)?.map(Number) || [];
                    if (coords.length >= 4) {
                        const xValues = coords.filter((_, i) => i % 2 === 0);
                        const yValues = coords.filter((_, i) => i % 2 === 1);
                        width = Math.max(...xValues) - Math.min(...xValues);
                        height = Math.max(...yValues) - Math.min(...yValues);
                    } else {
                        // 使用默认尺寸
                        width = 100;
                        height = 50;
                    }
                } else {
                    width = 100;
                    height = 50;
                }
            } else if (rect) {
                // 从rect元素获取尺寸
                width = parseFloat(rect.getAttribute('width'));
                height = parseFloat(rect.getAttribute('height'));
            } else {
                // 使用默认尺寸
                width = 100;
                height = 50;
            }

            // 查找节点文本
            let text = '新节点';
            if (textElement) {
                text = textElement.textContent.trim() || text;
            }

            // 创建节点
            const node = new Node(this.nextNodeId++, text, centerX, centerY);
            node.width = width;
            node.height = height;

            // 设置节点样式
            if (nodeElement.hasAttribute('fill')) {
                node.style.nodeColor = nodeElement.getAttribute('fill');
            }
            if (nodeElement.hasAttribute('stroke')) {
                node.style.borderColor = nodeElement.getAttribute('stroke');
            }
            if (nodeElement.hasAttribute('stroke-width')) {
                // 节点样式系统没有borderWidth属性，所以不设置
            }

            if (textElement) {
                if (textElement.hasAttribute('fill')) {
                    node.style.fontColor = textElement.getAttribute('fill');
                }
                if (textElement.hasAttribute('font-size')) {
                    node.style.fontSize = parseInt(textElement.getAttribute('font-size'));
                }
                if (textElement.hasAttribute('font-family')) {
                    node.style.fontFamily = textElement.getAttribute('font-family');
                }
            }

            this.nodes.push(node);
            nodeMap.set(node.id, node);

            // 设置根节点
            if (index === 0) {
                this.rootNode = node;
            }
        });

        // 如果没有找到节点组，尝试直接解析rect元素
        if (this.nodes.length === 0) {
            const rectElements = svgElement.querySelectorAll('rect');
            rectElements.forEach((rect, index) => {
                const x = parseFloat(rect.getAttribute('x'));
                const y = parseFloat(rect.getAttribute('y'));
                const width = parseFloat(rect.getAttribute('width'));
                const height = parseFloat(rect.getAttribute('height'));
                const centerX = x + width / 2;
                const centerY = y + height / 2;

                // 查找最近的文本元素
                let text = '新节点';
                const textElements = svgElement.querySelectorAll('text');
                let closestText = null;
                let minDistance = Infinity;

                textElements.forEach(txtEl => {
                    const txtX = parseFloat(txtEl.getAttribute('x'));
                    const txtY = parseFloat(txtEl.getAttribute('y'));
                    const distance = Math.sqrt(Math.pow(txtX - centerX, 2) + Math.pow(txtY - centerY, 2));
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestText = txtEl;
                    }
                });

                if (closestText && minDistance < width) {
                    text = closestText.textContent.trim() || text;
                }

                const node = new Node(this.nextNodeId++, text, centerX, centerY);
                node.width = width;
                node.height = height;

                // 设置节点样式
                if (rect.hasAttribute('fill')) {
                    node.style.nodeColor = rect.getAttribute('fill');
                }
                if (rect.hasAttribute('stroke')) {
                    node.style.borderColor = rect.getAttribute('stroke');
                }

                if (closestText) {
                    if (closestText.hasAttribute('fill')) {
                        node.style.fontColor = closestText.getAttribute('fill');
                    }
                    if (closestText.hasAttribute('font-size')) {
                        node.style.fontSize = parseInt(closestText.getAttribute('font-size'));
                    }
                    if (closestText.hasAttribute('font-family')) {
                        node.style.fontFamily = closestText.getAttribute('font-family');
                    }
                }

                this.nodes.push(node);
                nodeMap.set(node.id, node);

                if (index === 0) {
                    this.rootNode = node;
                }
            });
        }

        // 解析连接关系
        const connections = svgElement.querySelectorAll('.connection');
        const arrows = svgElement.querySelectorAll('.arrow');

        // 分析连接线的路径数据，建立正确的父子关系
        connections.forEach(connection => {
            const d = connection.getAttribute('d');
            if (!d) return;

            // 解析贝塞尔曲线的所有点
            // 路径格式：M startX startY C control1X control1Y, control2X control2Y, endX endY
            // 或：M startX startY C control1X control1Y control2X control2Y endX endY
            const pathParts = d.match(/[MLC]\s*([\d.]+)\s+([\d.]+)/gi) || [];
            if (pathParts.length < 2) return;

            // 获取起点和终点
            const startMatch = pathParts[0].match(/[MLC]\s*([\d.]+)\s+([\d.]+)/i);
            const endMatch = pathParts[pathParts.length - 1].match(/[MLC]\s*([\d.]+)\s+([\d.]+)/i);
            
            if (!startMatch || !endMatch) return;

            const start = { x: parseFloat(startMatch[1]), y: parseFloat(startMatch[2]) };
            const end = { x: parseFloat(endMatch[1]), y: parseFloat(endMatch[2]) };

            // 找到最接近起点的节点
            let closestStartNode = null;
            let minStartDistance = Infinity;

            this.nodes.forEach(node => {
                // 计算节点中心点到起点的距离
                const distance = Math.sqrt(Math.pow(start.x - node.x, 2) + Math.pow(start.y - node.y, 2));
                if (distance < minStartDistance) {
                    minStartDistance = distance;
                    closestStartNode = node;
                }
            });

            // 找到最接近终点的节点
            let closestEndNode = null;
            let minEndDistance = Infinity;

            this.nodes.forEach(node => {
                // 计算节点中心点到终点的距离
                const distance = Math.sqrt(Math.pow(end.x - node.x, 2) + Math.pow(end.y - node.y, 2));
                if (distance < minEndDistance) {
                    minEndDistance = distance;
                    closestEndNode = node;
                }
            });

            // 确定父子关系：使用更精确的算法
            if (closestStartNode && closestEndNode && closestStartNode !== closestEndNode) {
                let parent, child;
                
                // 1. 计算节点中心点的相对位置
                const dx = closestEndNode.x - closestStartNode.x;
                const dy = closestEndNode.y - closestStartNode.y;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                
                // 2. 计算连接线的方向
                const lineDx = end.x - start.x;
                const lineDy = end.y - start.y;
                const lineAngle = Math.atan2(lineDy, lineDx) * 180 / Math.PI;
                
                // 3. 基于节点位置和连接线方向确定父子关系
                // 通常情况下，父节点是连接线的源点，子节点是目标点
                // 但需要考虑节点的实际位置关系
                if (Math.abs(dx) > Math.abs(dy)) {
                    // 水平方向为主
                    if (dx > 0) {
                        // 终点在起点右侧，通常起点是父节点
                        parent = closestStartNode;
                        child = closestEndNode;
                    } else {
                        // 终点在起点左侧，通常终点是父节点
                        parent = closestEndNode;
                        child = closestStartNode;
                    }
                } else {
                    // 垂直方向为主
                    if (dy > 0) {
                        // 终点在起点下方，通常起点是父节点
                        parent = closestStartNode;
                        child = closestEndNode;
                    } else {
                        // 终点在起点上方，通常终点是父节点
                        parent = closestEndNode;
                        child = closestStartNode;
                    }
                }
                
                // 4. 特殊处理：如果有"中心节点"和"父节点"，确保正确连接
                if ((closestStartNode.text.includes('中心节点') || closestStartNode.text.includes('中心')) && 
                    (closestEndNode.text.includes('父节点') || closestEndNode.text.includes('父'))) {
                    // 中心节点应该是父节点，父节点是子节点
                    parent = closestStartNode;
                    child = closestEndNode;
                } else if ((closestEndNode.text.includes('中心节点') || closestEndNode.text.includes('中心')) && 
                           (closestStartNode.text.includes('父节点') || closestStartNode.text.includes('父'))) {
                    // 中心节点应该是父节点，父节点是子节点
                    parent = closestEndNode;
                    child = closestStartNode;
                }
                
                // 建立连接
                if (parent && child && 
                    !parent.children.includes(child) && 
                    !child.parents.includes(parent)) {
                    parent.addChild(child);
                }
            }
        });

        // 如果没有通过连接线找到连接关系，使用位置推断作为后备
        if (this.nodes.length > 1) {
            // 计算每个节点的连接数
            const connectionCount = new Map();
            this.nodes.forEach(node => {
                connectionCount.set(node, node.children.length + node.parents.length);
            });

            // 为没有连接的节点尝试位置推断
            this.nodes.forEach(node => {
                if (connectionCount.get(node) === 0) {
                    let closestParent = null;
                    let minDistance = Infinity;

                    this.nodes.forEach(otherNode => {
                        if (otherNode !== node) {
                            // 考虑所有方向，但优先考虑左侧和上方的节点
                            const dx = node.x - otherNode.x;
                            const dy = node.y - otherNode.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            // 给左侧和上方的节点更高优先级（更小的有效距离）
                            let effectiveDistance = distance;
                            if (dx > 0 && Math.abs(dx) > Math.abs(dy)) {
                                // 左侧节点，水平距离为主
                                effectiveDistance *= 0.8;
                            } else if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
                                // 上方节点，垂直距离为主
                                effectiveDistance *= 0.9;
                            }
                            
                            if (effectiveDistance < minDistance) {
                                minDistance = effectiveDistance;
                                closestParent = otherNode;
                            }
                        }
                    });

                    if (closestParent && minDistance < 250) {
                        closestParent.addChild(node);
                    }
                }
            });
        }

        // 特殊处理：确保中心节点是根节点
        const centerNodes = this.nodes.filter(node => 
            node.text.includes('中心节点') || node.text.includes('中心')
        );
        if (centerNodes.length > 0) {
            this.rootNode = centerNodes[0];
        } else if (this.nodes.length > 0) {
            // 如果没有中心节点，选择最左上方的节点作为根节点
            this.rootNode = this.nodes.reduce((prev, curr) => {
                return (prev.x + prev.y) < (curr.x + curr.y) ? prev : curr;
            });
        }

        // 重新渲染思维导图
        this.render();

    }
    
    // 初始化保存弹窗事件监听
    initSaveDialogListeners() {
        const saveDialog = document.getElementById('saveDialog');
        const closeBtn = document.getElementById('closeSaveDialog');
        const cancelBtn = document.getElementById('cancelSave');
        const confirmBtn = document.getElementById('confirmSave');
        const formatSelect = document.getElementById('saveFormatSelect');
        const fileNameInput = document.getElementById('fileNameInput');
        
        // 关闭弹窗
        const closeDialog = () => {
            saveDialog.classList.remove('active');
        };
        
        // 打开弹窗
        const openDialog = () => {
            saveDialog.classList.add('active');
        };
        
        // 确认保存
        const confirmSave = () => {
            const format = formatSelect ? formatSelect.value : 'svg';
            const fileName = fileNameInput ? fileNameInput.value.trim() : 'mindmap';
            
            // 确保文件名不为空
            const finalFileName = fileName || 'mindmap';
            
            // 执行保存操作
            this.saveMap(format, finalFileName);
            
            // 关闭弹窗
            closeDialog();
        };
        
        // 绑定事件
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);
        if (confirmBtn) confirmBtn.addEventListener('click', confirmSave);
        
        // 点击弹窗外部关闭
        if (saveDialog) {
            saveDialog.addEventListener('click', (e) => {
                if (e.target === saveDialog) {
                    closeDialog();
                }
            });
        }
        
        // 回车键确认保存
        if (fileNameInput) {
            fileNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmSave();
                }
            });
        }
    }
    
    // 打开保存弹窗
    openSaveDialog() {
        const saveDialog = document.getElementById('saveDialog');
        if (saveDialog) {
            saveDialog.classList.add('active');
            
            // 设置默认文件名
            const fileNameInput = document.getElementById('fileNameInput');
            if (fileNameInput) {
                fileNameInput.value = 'mindmap';
                fileNameInput.focus();
                fileNameInput.select();
            }
        }
    }
    
    initEventListeners() {
        // 工具栏按钮事件 - 检查元素是否存在
        
        const saveMapBtn = document.getElementById('saveMap');
        if (saveMapBtn) {
            saveMapBtn.addEventListener('click', () => this.openSaveDialog());
        }
        
        const loadMapBtn = document.getElementById('loadMap');
        if (loadMapBtn) {
            loadMapBtn.addEventListener('click', () => this.loadMap());
        }
        
        // 自动布局按钮事件
        const autoLayoutBtn = document.getElementById('autoLayout');
        if (autoLayoutBtn) {
            autoLayoutBtn.addEventListener('click', () => this.autoLayout());
        }
        
        // 自定义保存弹窗事件
        this.initSaveDialogListeners();
        
        // 样式面板事件 - 检查元素是否存在
        var styleInputs = ['nodeColor', 'borderColor', 'fontColor', 'fontSize', 'fontFamily', 'connectionColor'];
        var self = this;
        styleInputs.forEach(function(id) {
            var element = document.getElementById(id);
            if (element) {
                if (id === 'connectionColor') {
                    element.addEventListener('change', function() {
                        self.updateConnectionColor();
                    });
                } else {
                    element.addEventListener('change', function() {
                        self.updateNodeStyle();
                    });
                }
                
                // 为字体大小添加鼠标滚轮事件监听
                if (id === 'fontSize') {
                    element.addEventListener('wheel', function(e) {
                        e.preventDefault(); // 阻止默认滚动行为
                        var currentValue = parseInt(element.value);
                        var delta = e.deltaY > 0 ? -1 : 1; // 向上滚动增大，向下滚动减小
                        var newValue = Math.max(8, Math.min(36, currentValue + delta));
                        element.value = newValue;
                        self.updateNodeStyle();
                    });
                }
                
                // 为字体选择添加鼠标滚轮事件监听
                if (id === 'fontFamily') {
                    element.addEventListener('wheel', function(e) {
                        e.preventDefault(); // 阻止默认滚动行为
                        var options = element.options;
                        var currentIndex = element.selectedIndex;
                        var delta = e.deltaY > 0 ? 1 : -1; // 向上滚动选择上一个字体，向下滚动选择下一个字体
                        var newIndex = (currentIndex + delta + options.length) % options.length;
                        element.selectedIndex = newIndex;
                        self.updateNodeStyle();
                    });
                }
            }
        });
        
        // 颜色调色板事件监听
        var colorPalettes = document.querySelectorAll('.color-palette');
        colorPalettes.forEach(function(palette) {
            var targetId = palette.getAttribute('data-target');
            var targetElement = document.getElementById(targetId);
            var colorSwatches = palette.querySelectorAll('.color-swatch');
            
            colorSwatches.forEach(function(swatch) {
                swatch.addEventListener('click', function() {
                    var color = swatch.style.backgroundColor;
                    // 将颜色转换为十六进制格式
                    if (color.indexOf('rgb') !== -1) {
                        color = rgbToHex(color);
                    }
                    targetElement.value = color;
                    // 触发相应的更新函数
                    if (targetId === 'connectionColor') {
                        self.updateConnectionColor();
                    } else {
                        self.updateNodeStyle();
                    }
                });
            });
        });
        
        // RGB 转十六进制颜色函数
        function rgbToHex(rgb) {
            var result = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            if (result) {
                var r = parseInt(result[1]);
                var g = parseInt(result[2]);
                var b = parseInt(result[3]);
                return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            }
            return rgb; // 如果不是RGB格式，直接返回
        }
        
        // 十六进制转RGB函数
        function hexToRgb(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
        
        // 初始化自定义颜色选择器
        function initCustomColorPicker(self) {
            var customColorPicker = document.getElementById('customColorPicker');
            var colorGradient = document.getElementById('colorGradient');
            var colorPicker = document.getElementById('colorPicker');
            var colorPickerDot = document.getElementById('colorPickerDot');
            var rainbowBar = document.getElementById('rainbowBar');
            var rainbowPicker = document.getElementById('rainbowPicker');
            var rainbowPickerDot = document.getElementById('rainbowPickerDot');
            var colorPreview = document.getElementById('colorPreview');
            var rInput = document.getElementById('rInput');
            var gInput = document.getElementById('gInput');
            var bInput = document.getElementById('bInput');
            var closeColorPicker = document.getElementById('closeColorPicker');
            
            if (!customColorPicker) return;
            
            // 存储当前目标颜色输入框和当前颜色
            var currentTarget = null;
            var currentHue = 0; // 当前色相
            
            // 为所有自定义颜色选择器按钮添加点击事件
            var customColorButtons = document.querySelectorAll('.custom-color-picker');
            customColorButtons.forEach(function(button) {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    // 打开自定义颜色选择器
                    currentTarget = button;
                    
                    // 设置当前颜色
                    var currentColor = button.value;
                    var rgb = hexToRgb(currentColor);
                    if (rgb) {
                        // 更新RGB输入
                        rInput.value = rgb.r;
                        gInput.value = rgb.g;
                        bInput.value = rgb.b;
                        
                        // 更新颜色预览
                        colorPreview.style.backgroundColor = currentColor;
                        
                        // 更新颜色渐变区域的背景色（基于色相）
                        updateColorGradient(rgbToHsl(currentColor).h);
                        
                        // 更新选择器位置
                        updatePickerPositions(rgb);
                    }
                    
                    // 定位颜色选择器 - 使其在颜色选择面板下方出现并与面板等宽
                    var buttonRect = button.getBoundingClientRect();
                    var colorPalette = button.parentElement; // 获取颜色选择面板
                    var paletteRect = colorPalette.getBoundingClientRect();
                    var windowHeight = window.innerHeight;
                    var windowWidth = window.innerWidth;
                    var pickerHeight = customColorPicker.offsetHeight;
                    
                    // 设置颜色选择器与面板等宽
                    customColorPicker.style.width = paletteRect.width + 'px';
                    
                    // 计算位置，使颜色选择器在面板下方居中对齐
                    var left = paletteRect.left;
                    var top = paletteRect.bottom + 5;
                    
                    // 调整位置以避免超出可视区域
                    if (top + pickerHeight > windowHeight) {
                        top = paletteRect.top - pickerHeight - 5;
                    }
                    if (left < 0) {
                        left = 0;
                    } else if (left + paletteRect.width > windowWidth) {
                        left = windowWidth - paletteRect.width;
                    }
                    
                    customColorPicker.style.left = left + 'px';
                    customColorPicker.style.top = top + 'px';
                    customColorPicker.classList.add('active');
                });
            });
            
            // 关闭颜色选择器
            closeColorPicker.addEventListener('click', function() {
                customColorPicker.classList.remove('active');
            });
            
            // 点击外部关闭颜色选择器
            document.addEventListener('click', function(e) {
                if (!customColorPicker.contains(e.target) && !e.target.classList.contains('custom-color-picker')) {
                    customColorPicker.classList.remove('active');
                }
            });
            
            // HSL转RGB函数
            function hslToRgb(h, s, l) {
                h /= 360;
                s /= 100;
                l /= 100;
                let r, g, b;
                
                if (s === 0) {
                    r = g = b = l; // 灰色
                } else {
                    const hue2rgb = (p, q, t) => {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1/6) return p + (q - p) * 6 * t;
                        if (t < 1/2) return q;
                        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                        return p;
                    };
                    
                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    const p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1/3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1/3);
                }
                
                return {
                    r: Math.round(r * 255),
                    g: Math.round(g * 255),
                    b: Math.round(b * 255)
                };
            }
            
            // RGB转HSL函数
            function rgbToHsl(rgbColor) {
                var rgb = hexToRgb(rgbColor);
                if (!rgb) return {h: 0, s: 0, l: 100};
                
                var r = rgb.r / 255;
                var g = rgb.g / 255;
                var b = rgb.b / 255;
                
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                let h, s, l = (max + min) / 2;
                
                if (max === min) {
                    h = s = 0; // 灰色
                } else {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h /= 6;
                }
                
                return {
                    h: Math.round(h * 360),
                    s: Math.round(s * 100),
                    l: Math.round(l * 100)
                };
            }
            
            // 更新颜色渐变区域的背景色
            function updateColorGradient(hue) {
                currentHue = hue;
                // 创建色相为hue的纯色
                var pureColor = hslToRgb(hue, 100, 50);
                var pureHex = '#' + ((1 << 24) + (pureColor.r << 16) + (pureColor.g << 8) + pureColor.b).toString(16).slice(1);
                
                // 更新颜色渐变的背景
                colorGradient.style.background = 'linear-gradient(to top, #000000, transparent), ' +
                                               'linear-gradient(to right, #ffffff, ' + pureHex + ')';
            }
            
            // 更新选择器位置
            function updatePickerPositions(rgb) {
                var hsl = rgbToHsl('#' + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1));
                
                // 更新颜色选择器位置（基于饱和度和亮度）
                var x = (hsl.s / 100) * 100;
                var y = (100 - hsl.l) / 100 * 100;
                colorPickerDot.style.left = x + '%';
                colorPickerDot.style.top = y + '%';
                
                // 更新彩虹色条选择器位置（基于色相）
                var hueX = (hsl.h / 360) * 100;
                rainbowPickerDot.style.left = hueX + '%';
                
                // 更新当前色相
                currentHue = hsl.h;
            }
            
            // 从颜色渐变区域获取颜色
            function getColorFromGradient(x, y) {
                var rect = colorGradient.getBoundingClientRect();
                var relativeX = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
                var relativeY = Math.max(0, Math.min(1, (y - rect.top) / rect.height));
                
                // 计算饱和度和亮度
                var saturation = relativeX * 100;
                var lightness = (1 - relativeY) * 100;
                
                // 转换为RGB
                var rgb = hslToRgb(currentHue, saturation, lightness);
                return rgb;
            }
            
            // 从彩虹色条获取色相
            function getHueFromRainbow(x) {
                var rect = rainbowBar.getBoundingClientRect();
                var relativeX = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
                return relativeX * 360;
            }
            
            // 更新RGB值并应用到目标
            function updateAndApplyColor(rgb) {
                // 更新RGB输入
                rInput.value = rgb.r;
                gInput.value = rgb.g;
                bInput.value = rgb.b;
                
                // 更新颜色预览
                var hexColor = '#' + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1);
                colorPreview.style.backgroundColor = hexColor;
                
                // 应用颜色到目标
                if (currentTarget) {
                    currentTarget.value = hexColor;
                    
                    // 触发目标元素的change事件
                    var targetId = currentTarget.id;
                    if (targetId === 'connectionColor') {
                        self.updateConnectionColor();
                    } else {
                        self.updateNodeStyle();
                    }
                }
            }
            
            // 颜色渐变区域鼠标事件
            colorPicker.addEventListener('mousedown', function(e) {
                e.preventDefault();
                
                // 更新颜色
                var rgb = getColorFromGradient(e.clientX, e.clientY);
                updateAndApplyColor(rgb);
                
                // 更新选择器位置
                var rect = colorGradient.getBoundingClientRect();
                var x = ((e.clientX - rect.left) / rect.width) * 100;
                var y = ((e.clientY - rect.top) / rect.height) * 100;
                colorPickerDot.style.left = x + '%';
                colorPickerDot.style.top = y + '%';
                
                // 鼠标移动事件
                function mouseMove(e) {
                    e.preventDefault();
                    var rgb = getColorFromGradient(e.clientX, e.clientY);
                    updateAndApplyColor(rgb);
                    
                    var rect = colorGradient.getBoundingClientRect();
                    var x = ((e.clientX - rect.left) / rect.width) * 100;
                    var y = ((e.clientY - rect.top) / rect.height) * 100;
                    colorPickerDot.style.left = x + '%';
                    colorPickerDot.style.top = y + '%';
                }
                
                // 鼠标释放事件
                function mouseUp() {
                    document.removeEventListener('mousemove', mouseMove);
                    document.removeEventListener('mouseup', mouseUp);
                }
                
                // 添加事件监听
                document.addEventListener('mousemove', mouseMove);
                document.addEventListener('mouseup', mouseUp);
            });
            
            // 彩虹色条鼠标事件
            rainbowPicker.addEventListener('mousedown', function(e) {
                e.preventDefault();
                
                // 更新色相
                var hue = getHueFromRainbow(e.clientX);
                updateColorGradient(hue);
                
                // 更新彩虹色条选择器位置
                var rect = rainbowBar.getBoundingClientRect();
                var x = ((e.clientX - rect.left) / rect.width) * 100;
                rainbowPickerDot.style.left = x + '%';
                
                // 重新计算当前颜色（保持饱和度和亮度不变）
                var rectColorPicker = colorPickerDot.getBoundingClientRect();
                var rectGradient = colorGradient.getBoundingClientRect();
                var rgb = getColorFromGradient(rectColorPicker.left + rectColorPicker.width / 2, 
                                              rectColorPicker.top + rectColorPicker.height / 2);
                updateAndApplyColor(rgb);
                
                // 鼠标移动事件
                function mouseMove(e) {
                    e.preventDefault();
                    var hue = getHueFromRainbow(e.clientX);
                    updateColorGradient(hue);
                    
                    var rect = rainbowBar.getBoundingClientRect();
                    var x = ((e.clientX - rect.left) / rect.width) * 100;
                    rainbowPickerDot.style.left = x + '%';
                    
                    var rectColorPicker = colorPickerDot.getBoundingClientRect();
                    var rectGradient = colorGradient.getBoundingClientRect();
                    var rgb = getColorFromGradient(rectColorPicker.left + rectColorPicker.width / 2, 
                                                  rectColorPicker.top + rectColorPicker.height / 2);
                    updateAndApplyColor(rgb);
                }
                
                // 鼠标释放事件
                function mouseUp() {
                    document.removeEventListener('mousemove', mouseMove);
                    document.removeEventListener('mouseup', mouseUp);
                }
                
                // 添加事件监听
                document.addEventListener('mousemove', mouseMove);
                document.addEventListener('mouseup', mouseUp);
            });
            
            // RGB输入变化时更新
            rInput.addEventListener('input', function() {
                var rgb = {
                    r: parseInt(rInput.value) || 0,
                    g: parseInt(gInput.value) || 0,
                    b: parseInt(bInput.value) || 0
                };
                updateAndApplyColor(rgb);
                updatePickerPositions(rgb);
                updateColorGradient(rgbToHsl('#' + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1)).h);
            });
            
            gInput.addEventListener('input', function() {
                var rgb = {
                    r: parseInt(rInput.value) || 0,
                    g: parseInt(gInput.value) || 0,
                    b: parseInt(bInput.value) || 0
                };
                updateAndApplyColor(rgb);
                updatePickerPositions(rgb);
                updateColorGradient(rgbToHsl('#' + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1)).h);
            });
            
            bInput.addEventListener('input', function() {
                var rgb = {
                    r: parseInt(rInput.value) || 0,
                    g: parseInt(gInput.value) || 0,
                    b: parseInt(bInput.value) || 0
                };
                updateAndApplyColor(rgb);
                updatePickerPositions(rgb);
                updateColorGradient(rgbToHsl('#' + ((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1)).h);
            });
        }
        
        // 初始化自定义颜色选择器
        initCustomColorPicker(self);
        
        // 画布点击事件（取消选择）
        this.canvas.addEventListener('click', (e) => {
            // 如果是刚完成框选操作，不取消选择
            if (this.justFinishedSelection) {
                this.justFinishedSelection = false;
                return;
            }
            
            if (e.target === this.canvas) {
                this.selectedNode = null;
                this.selectedNodes = [];
                this.updateStylePanel();
                this.render();
            }
        });
        
        // 画布按下事件（开始框选或画布拖动）
        this.canvas.addEventListener('mousedown', (e) => {
            // 如果处于编辑模式，不执行任何操作
            if (this.isEditingNode) {
                return;
            }
            
            // 如果点击的是画布本身（不是节点或其他元素）
            if (e.target === this.canvas) {
                // 确保只有一个操作状态被激活
                this.isPanning = false;
                this.isSelecting = false;
                
                // 直接检查事件对象中的Ctrl键状态，而不是依赖keydown事件更新的变量
                if (e.ctrlKey || e.metaKey) {
                    this.isPanning = true;
                    const coords = this.clientToSvgCoords(e.clientX, e.clientY);
                    this.panStartX = coords.x;
                    this.panStartY = coords.y;
                    // 更改鼠标样式为拖动指针
                    this.canvas.style.cursor = 'grabbing';
                    // 立即更新Ctrl键状态
                    this.isCtrlPressed = true;
                } else {
                    // 否则开始框选
                    this.startSelection(e);
                }
            }
        });
        
        // 鼠标移动事件（处理框选或画布拖动）
        this.canvas.addEventListener('mousemove', (e) => {
            // 如果处于编辑模式，不执行任何操作
            if (this.isEditingNode) {
                return;
            }
            
            // 如果正在进行画布拖动
            if (this.isPanning) {
                const coords = this.clientToSvgCoords(e.clientX, e.clientY);
                // 计算拖动距离
                const deltaX = coords.x - this.panStartX;
                const deltaY = coords.y - this.panStartY;
                
                // 更新画布偏移量
                this.canvasOffsetX += deltaX;
                this.canvasOffsetY += deltaY;
                
                // 更新拖动起点
                this.panStartX = coords.x;
                this.panStartY = coords.y;
                
                // 重新渲染画布
                this.render();
            } else if (this.isSelecting) {
                // 处理框选
                this.selectionMove(e);
            } else if (this.draggedNode) {
                // 处理节点拖动
                this.dragNode(e);
            }
        });
        
        // 鼠标释放事件（结束框选或画布拖动）
        this.canvas.addEventListener('mouseup', (e) => {
            // 如果处于编辑模式，不执行任何操作
            if (this.isEditingNode) {
                return;
            }
            
            // 如果正在进行画布拖动
            if (this.isPanning) {
                this.isPanning = false;
                // 恢复鼠标样式
                this.canvas.style.cursor = 'default';
            } else if (this.isSelecting) {
                // 结束框选
                this.stopSelection(e);
            } else if (this.draggedNode) {
                // 结束节点拖动
                this.stopDrag();
            }
        });
        
        // 鼠标离开画布事件（结束所有操作）
        this.canvas.addEventListener('mouseleave', () => {
            // 如果处于编辑模式，不执行任何操作
            if (this.isEditingNode) {
                return;
            }
            
            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.style.cursor = 'default';
            } else if (this.isSelecting) {
                this.stopSelection();
            } else if (this.draggedNode) {
                this.stopDrag();
            }
        });
        
        // 双击画布创建节点（当没有节点存在时）
        this.canvas.addEventListener('dblclick', (e) => {
            if (this.nodes.length === 0) {
                // 获取画布的边界矩形
                const rect = this.canvas.getBoundingClientRect();
                
                // 计算双击位置相对于画布的坐标（屏幕坐标）
                const screenX = e.clientX - rect.left;
                const screenY = e.clientY - rect.top;
                
                // 考虑当前画布偏移量，计算节点的世界坐标
                // 节点渲染时会加上canvasOffsetX/Y，所以这里需要减去它们
                // 这样节点才能准确出现在双击的屏幕位置
                const worldX = screenX - this.canvasOffsetX;
                const worldY = screenY - this.canvasOffsetY;
                
                // 创建空节点，使用计算出的世界坐标
                const newNode = this.createNode('', worldX, worldY);
                this.rootNode = newNode;
                this.selectNode(newNode);
                this.render();
            }
        });
        
        // 键盘事件监听器 - Delete键删除选中节点，Ctrl+C/Ctrl+V复制粘贴
        document.addEventListener('keydown', (e) => {
            // 更新Ctrl键状态
            this.isCtrlPressed = e.ctrlKey || e.metaKey;
            
            // 只有Delete键能删除节点，Backspace键不能删除节点，防止误删
            if (e.key === 'Delete') {
                // 如果正在编辑节点文本，不执行节点删除操作
                if (this.isEditingNode) {
                    return; // 让事件自然冒泡，由文本编辑框处理
                }
                
                // 阻止默认行为，防止影响其他操作
                e.preventDefault();
                
                // 如果有多个选中节点，全部删除
                if (this.selectedNodes.length > 0) {
                    // 创建副本以避免在循环中修改原数组
                    const nodesToDelete = [...this.selectedNodes];
                    // 清空选择状态
                    this.selectedNodes = [];
                    this.selectedNode = null;
                    // 删除所有选中的节点
                    nodesToDelete.forEach(node => {
                        this.deleteNode(node);
                    });
                }
                // 如果只有单个选中节点，删除该节点
                else if (this.selectedNode) {
                    this.deleteNode(this.selectedNode);
                } else {
                    // 可以选择不显示提示，让用户知道需要先选中节点
                    // alert('请先选择一个节点！');
                }
            }
            // 按'V'键创建父节点
            else if (e.key === 'v' || e.key === 'V') {
                // 如果正在编辑节点文本，不执行节点创建操作
                if (this.isEditingNode) {
                    return; // 让事件自然冒泡，由文本编辑框处理
                }
                e.preventDefault();
                // 如果有选中节点，为选中节点添加父节点
                if (this.selectedNode) {
                    this.addParentNode(this.selectedNode);
                }
            }
            // 按'B'键创建子节点
            else if (e.key === 'b' || e.key === 'B') {
                // 如果正在编辑节点文本，不执行节点创建操作
                if (this.isEditingNode) {
                    return; // 让事件自然冒泡，由文本编辑框处理
                }
                e.preventDefault();
                // 如果有选中节点，为选中节点添加子节点
                if (this.selectedNode) {
                    this.addChildNode(this.selectedNode);
                }
            }
            // 按'Insert'键进入编辑模式
            else if (e.key === 'Insert') {
                // 如果正在编辑节点文本，不执行任何操作
                if (this.isEditingNode) {
                    return; // 让事件自然冒泡，由文本编辑框处理
                }
                e.preventDefault();
                // 如果有选中节点，进入编辑模式
                if (this.selectedNode) {
                    this.editNodeText(this.selectedNode);
                }
            }
            // 复制功能 (Ctrl+C)
            else if (this.isCtrlPressed && e.key === 'c') {
                // 如果正在编辑节点文本，不执行节点复制操作，让默认的文本复制行为发生
                if (this.isEditingNode) {
                    return; // 让事件自然冒泡，由文本编辑框处理
                }
                e.preventDefault();
                this.copySelectedNodes();
            }
            // 粘贴功能 (Ctrl+V)
            else if (this.isCtrlPressed && e.key === 'v') {
                // 如果正在编辑节点文本，不执行节点粘贴操作，让默认的文本粘贴行为发生
                if (this.isEditingNode) {
                    return; // 让事件自然冒泡，由文本编辑框处理
                }
                e.preventDefault();
                this.pasteNodes();
            }
            // 撤销功能 (Ctrl+Z)
            else if (this.isCtrlPressed && e.key === 'z') {
                // 如果正在编辑节点文本，不执行思维导图撤销操作，让默认的文本撤销行为发生
                if (this.isEditingNode) {
                    return; // 让事件自然冒泡，由文本编辑框处理
                }
                e.preventDefault();
                this.undo();
            }
            // 重做功能 (Ctrl+Y)
            else if (this.isCtrlPressed && e.key === 'y') {
                // 如果正在编辑节点文本，不执行思维导图重做操作，让默认的文本重做行为发生
                if (this.isEditingNode) {
                    return; // 让事件自然冒泡，由文本编辑框处理
                }
                e.preventDefault();
                this.redo();
            }
            // 全选功能 (Ctrl+A)
            else if (this.isCtrlPressed && e.key === 'a') {
                // 如果正在编辑节点文本，不执行节点全选操作，让默认的文本全选行为发生
                if (this.isEditingNode) {
                    return; // 让事件自然冒泡，由文本编辑框处理
                }
                e.preventDefault();
                // 选择所有节点
                if (this.nodes.length > 0) {
                    this.selectedNodes = [...this.nodes];
                    this.selectedNode = this.nodes[0]; // 设置第一个节点为主要选中节点
                    this.updateStylePanel();
                    this.render();
                }
            }
        });
        
        // 监听Ctrl键释放事件
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Control' || e.key === 'Meta') {
                this.isCtrlPressed = false;
            }
        });
        
        // 触摸事件处理（移动设备）
        // 触摸开始事件
        this.canvas.addEventListener('touchstart', (e) => {
            // 如果有两个手指触摸，开始两指拖动
            if (e.touches.length === 2) {
                this.isPanning = true;
                // 计算两指中心点
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const centerX = (touch1.clientX + touch2.clientX) / 2;
                const centerY = (touch1.clientY + touch2.clientY) / 2;
                
                const coords = this.clientToSvgCoords(centerX, centerY);
                this.panStartX = coords.x;
                this.panStartY = coords.y;
                
                // 阻止默认行为
                e.preventDefault();
            }
        });
        
        // 触摸移动事件
        this.canvas.addEventListener('touchmove', (e) => {
            // 如果正在进行两指拖动
            if (this.isPanning && e.touches.length === 2) {
                // 计算两指中心点
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const centerX = (touch1.clientX + touch2.clientX) / 2;
                const centerY = (touch1.clientY + touch2.clientY) / 2;
                
                const coords = this.clientToSvgCoords(centerX, centerY);
                // 计算拖动距离
                const deltaX = coords.x - this.panStartX;
                const deltaY = coords.y - this.panStartY;
                
                // 更新画布偏移量
                this.canvasOffsetX += deltaX;
                this.canvasOffsetY += deltaY;
                
                // 更新拖动起点
                this.panStartX = coords.x;
                this.panStartY = coords.y;
                
                // 重新渲染画布
                this.render();
                
                // 阻止默认行为
                e.preventDefault();
            }
        });
        
        // 触摸结束事件
        this.canvas.addEventListener('touchend', (e) => {
            // 如果触摸点少于2个，结束拖动
            if (this.isPanning && e.touches.length < 2) {
                this.isPanning = false;
            }
        });
    }
    
    // 初始化缩略图功能
    initThumbnail() {
        if (!this.thumbnailCanvas) {
            console.error('Thumbnail canvas not found');
            return;
        }
        
        // 绑定缩略图点击事件
        this.thumbnailCanvas.addEventListener('click', (e) => {
            this.thumbnailClick(e);
        });
        
        // 初始化缩略图
        this.renderThumbnail();
    }
    
    // 计算所有节点的边界框
    calculateNodesBoundingBox() {
        if (this.nodes.length === 0) {
            // 默认画布大小 - 使用长方形（1200x800）代替正方形，提供更自然的宽高比
            const defaultWidth = 1200;
            const defaultHeight = 800;
            return { 
                minX: -defaultWidth/2, 
                minY: -defaultHeight/2, 
                maxX: defaultWidth/2, 
                maxY: defaultHeight/2, 
                width: defaultWidth, 
                height: defaultHeight 
            };
        }
        
        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;
        
        this.nodes.forEach(node => {
            // 计算节点的边界
            const nodeLeft = node.x - node.width / 2;
            const nodeTop = node.y - node.height / 2;
            const nodeRight = node.x + node.width / 2;
            const nodeBottom = node.y + node.height / 2;
            
            // 更新边界框
            minX = Math.min(minX, nodeLeft);
            minY = Math.min(minY, nodeTop);
            maxX = Math.max(maxX, nodeRight);
            maxY = Math.max(maxY, nodeBottom);
        });
        
        // 添加内边距（固定像素值，与缩放无关）
        const padding = 40;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        // 计算当前边界框的尺寸和中心
        const currentWidth = maxX - minX;
        const currentHeight = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // 确保边界框至少有一个最小尺寸
        const minCanvasSize = 600;
        if (currentWidth < minCanvasSize || currentHeight < minCanvasSize) {
            // 保持原始宽高比的同时扩展到最小尺寸
            const aspectRatio = currentWidth / currentHeight;
            let newWidth, newHeight;
            
            if (aspectRatio >= 1) {
                // 横向或正方形，以宽度为基准扩展
                newWidth = Math.max(currentWidth, minCanvasSize);
                newHeight = newWidth / aspectRatio;
            } else {
                // 纵向，以高度为基准扩展
                newHeight = Math.max(currentHeight, minCanvasSize);
                newWidth = newHeight * aspectRatio;
            }
            
            return {
                minX: centerX - newWidth / 2,
                minY: centerY - newHeight / 2,
                maxX: centerX + newWidth / 2,
                maxY: centerY + newHeight / 2,
                width: newWidth,
                height: newHeight
            };
        }
        
        return {
            minX,
            minY,
            maxX,
            maxY,
            width: currentWidth,
            height: currentHeight
        };
    }
    
    // 渲染缩略图
    renderThumbnail() {
        if (!this.thumbnailCanvas) return;
        
        // 计算所有节点的边界框
        const nodesBoundingBox = this.calculateNodesBoundingBox();
        
        // 获取主画布的可见区域尺寸
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // 保持缩略图尺寸固定
        this.thumbnailWidth = 200; // 固定宽度
        this.thumbnailHeight = 150; // 固定高度
        this.thumbnailCanvas.setAttribute('width', this.thumbnailWidth);
        this.thumbnailCanvas.setAttribute('height', this.thumbnailHeight);
        
        // 计算视口矩形的世界坐标边界
        const viewportLeft = -this.canvasOffsetX;
        const viewportTop = -this.canvasOffsetY;
        const viewportRight = -this.canvasOffsetX + canvasRect.width;
        const viewportBottom = -this.canvasOffsetY + canvasRect.height;
        
        // 计算视口矩形的边界框
        const viewportBoundingBox = {
            minX: viewportLeft,
            minY: viewportTop,
            maxX: viewportRight,
            maxY: viewportBottom,
            width: canvasRect.width,
            height: canvasRect.height
        };
        
        // 计算包含所有节点和视口矩形的总边界框
        // 从节点边界框开始
        let totalMinX = nodesBoundingBox.minX;
        let totalMinY = nodesBoundingBox.minY;
        let totalMaxX = nodesBoundingBox.maxX;
        let totalMaxY = nodesBoundingBox.maxY;
        
        // 扩展总边界框以包含视口矩形的所有边界
        totalMinX = Math.min(totalMinX, viewportLeft);
        totalMinY = Math.min(totalMinY, viewportTop);
        totalMaxX = Math.max(totalMaxX, viewportRight);
        totalMaxY = Math.max(totalMaxY, viewportBottom);
        
        // 添加额外的内边距，确保所有元素都能完全显示
        const extraPadding = 15;
        totalMinX -= extraPadding;
        totalMinY -= extraPadding;
        totalMaxX += extraPadding;
        totalMaxY += extraPadding;
        
        // 确保总边界框不为空
        if (totalMinX >= totalMaxX) {
            totalMaxX = totalMinX + 100;
        }
        if (totalMinY >= totalMaxY) {
            totalMaxY = totalMinY + 100;
        }
        
        const totalWidth = totalMaxX - totalMinX;
        const totalHeight = totalMaxY - totalMinY;
        
        // 根据总边界框和缩略图尺寸计算合适的缩放比例
        // 确保所有节点和视口矩形都能在缩略图中显示
        const padding = 10; // 缩略图内边距
        const availableWidth = this.thumbnailWidth - padding * 2;
        const availableHeight = this.thumbnailHeight - padding * 2;
        
        // 计算适应内容的缩放比例，确保所有内容都能完整显示
        const scaleX = availableWidth / totalWidth;
        const scaleY = availableHeight / totalHeight;
        
        // 只限制最小缩放比例，确保在节点过多时仍能显示所有元素
        const minScale = 0.01; // 进一步降低最小缩放比例，支持更多节点
        let effectiveScale = Math.min(scaleX, scaleY);
        effectiveScale = Math.max(effectiveScale, minScale); // 限制最小缩放比例
        
        // 确保缩放比例不为0
        if (isNaN(effectiveScale) || effectiveScale <= 0) {
            effectiveScale = 0.1;
        }
        
        // 更新当前使用的缩放比例
        this.thumbnailScale = effectiveScale;
        
        // 清空缩略图画布
        while (this.thumbnailCanvas.firstChild) {
            this.thumbnailCanvas.removeChild(this.thumbnailCanvas.firstChild);
        }
        
        // 绘制缩略图背景
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', 0);
        bgRect.setAttribute('y', 0);
        bgRect.setAttribute('width', this.thumbnailWidth);
        bgRect.setAttribute('height', this.thumbnailHeight);
        bgRect.setAttribute('fill', '#f8f9fa');
        bgRect.setAttribute('stroke', '#dee2e6');
        bgRect.setAttribute('stroke-width', '1');
        this.thumbnailCanvas.appendChild(bgRect);
        
        // 绘制网格背景（可选，用于增强视觉效果）
        const gridSize = 10;
        const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridGroup.setAttribute('opacity', '0.3');
        
        // 绘制垂直网格线
        for (let x = gridSize; x < this.thumbnailWidth; x += gridSize) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', 0);
            line.setAttribute('x2', x);
            line.setAttribute('y2', this.thumbnailHeight);
            line.setAttribute('stroke', '#dee2e6');
            line.setAttribute('stroke-width', '0.5');
            gridGroup.appendChild(line);
        }
        
        // 绘制水平网格线
        for (let y = gridSize; y < this.thumbnailHeight; y += gridSize) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', y);
            line.setAttribute('x2', this.thumbnailWidth);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', '#dee2e6');
            line.setAttribute('stroke-width', '0.5');
            gridGroup.appendChild(line);
        }
        this.thumbnailCanvas.appendChild(gridGroup);
        
        // 绘制画布边界线（基于总边界框）
        const thumbnailOriginX = (this.thumbnailWidth - totalWidth * this.thumbnailScale) / 2;
        const thumbnailOriginY = (this.thumbnailHeight - totalHeight * this.thumbnailScale) / 2;
        const canvasBoundaryRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        canvasBoundaryRect.setAttribute('x', thumbnailOriginX);
        canvasBoundaryRect.setAttribute('y', thumbnailOriginY);
        canvasBoundaryRect.setAttribute('width', totalWidth * this.thumbnailScale);
        canvasBoundaryRect.setAttribute('height', totalHeight * this.thumbnailScale);
        canvasBoundaryRect.setAttribute('fill', 'none');
        canvasBoundaryRect.setAttribute('stroke', '#adb5bd');
        canvasBoundaryRect.setAttribute('stroke-width', '1');
        canvasBoundaryRect.setAttribute('stroke-dasharray', '2,1');
        this.thumbnailCanvas.appendChild(canvasBoundaryRect);
        
        // 创建总边界框对象，传递给其他函数
        const totalBoundingBox = {
            minX: totalMinX,
            minY: totalMinY,
            maxX: totalMaxX,
            maxY: totalMaxY,
            width: totalWidth,
            height: totalHeight
        };
        
        // 绘制所有节点
        this.nodes.forEach(node => {
            this.drawNodeInThumbnail(node, totalBoundingBox);
        });
        
        // 绘制连接线
        this.renderConnectionsInThumbnail(totalBoundingBox);
        
        // 绘制视口矩形
        this.drawViewportRect(totalBoundingBox);
    }
    
    // 在缩略图中绘制单个节点
    drawNodeInThumbnail(node, boundingBox) {
        if (!this.thumbnailCanvas) return;
        
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // 计算节点尺寸
        const scaledWidth = node.width * this.thumbnailScale;
        const scaledHeight = node.height * this.thumbnailScale;
        
        // 计算缩略图的原点偏移（基于所有节点的边界框）
        const thumbnailOriginX = (this.thumbnailWidth - boundingBox.width * this.thumbnailScale) / 2;
        const thumbnailOriginY = (this.thumbnailHeight - boundingBox.height * this.thumbnailScale) / 2;
        
        // 计算节点在缩略图中的位置
        const finalX = thumbnailOriginX + (node.x - boundingBox.minX) * this.thumbnailScale;
        const finalY = thumbnailOriginY + (node.y - boundingBox.minY) * this.thumbnailScale;
        
        // 创建节点的跑道形状
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const radius = scaledHeight / 2;
        const x = finalX - scaledWidth / 2;
        const y = finalY - scaledHeight / 2;
        
        const pathData = [
            `M${x + radius} ${y}`,
            `L${x + scaledWidth - radius} ${y}`,
            `A${radius} ${radius} 0 0 1 ${x + scaledWidth} ${y + radius}`,
            `L${x + scaledWidth} ${y + scaledHeight - radius}`,
            `A${radius} ${radius} 0 0 1 ${x + scaledWidth - radius} ${y + scaledHeight}`,
            `L${x + radius} ${y + scaledHeight}`,
            `A${radius} ${radius} 0 0 1 ${x} ${y + scaledHeight - radius}`,
            `L${x} ${y + radius}`,
            `A${radius} ${radius} 0 0 1 ${x + radius} ${y}`,
            'Z'
        ].join(' ');
        
        path.setAttribute('d', pathData);
        path.setAttribute('fill', node.style.nodeColor);
        path.setAttribute('stroke', node.style.borderColor);
        path.setAttribute('stroke-width', '1');
        
        group.appendChild(path);
        this.thumbnailCanvas.appendChild(group);
    }
    
    // 在缩略图中渲染连接线
    renderConnectionsInThumbnail(boundingBox) {
        if (!this.thumbnailCanvas) return;
        
        // 绘制所有节点之间的连接线
        this.nodes.forEach(node => {
            node.children.forEach(child => {
                this.drawConnectionInThumbnail(node, child, boundingBox);
            });
        });
    }
    
    // 在缩略图中绘制连接线
    drawConnectionInThumbnail(parentNode, childNode, boundingBox) {
        if (!this.thumbnailCanvas) return;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        
        // 计算缩略图的原点偏移（基于所有节点的边界框）
        const thumbnailOriginX = (this.thumbnailWidth - boundingBox.width * this.thumbnailScale) / 2;
        const thumbnailOriginY = (this.thumbnailHeight - boundingBox.height * this.thumbnailScale) / 2;
        
        // 计算父节点和子节点在缩略图中的位置
        const finalParentX = thumbnailOriginX + (parentNode.x - boundingBox.minX) * this.thumbnailScale;
        const finalParentY = thumbnailOriginY + (parentNode.y - boundingBox.minY) * this.thumbnailScale;
        const finalChildX = thumbnailOriginX + (childNode.x - boundingBox.minX) * this.thumbnailScale;
        const finalChildY = thumbnailOriginY + (childNode.y - boundingBox.minY) * this.thumbnailScale;
        
        // 设置连接线的属性
        line.setAttribute('x1', finalParentX);
        line.setAttribute('y1', finalParentY);
        line.setAttribute('x2', finalChildX);
        line.setAttribute('y2', finalChildY);
        line.setAttribute('stroke', this.connectionColor);
        line.setAttribute('stroke-width', '0.5');
        
        this.thumbnailCanvas.appendChild(line);
    }
    
    // 绘制视口矩形
    drawViewportRect(boundingBox) {
        if (!this.thumbnailCanvas) return;
        
        // 获取主画布的可见区域尺寸
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // 计算视口在缩略图中的尺寸
        const scaledViewportWidth = canvasRect.width * this.thumbnailScale;
        const scaledViewportHeight = canvasRect.height * this.thumbnailScale;
        
        // 计算主画布可见区域的世界坐标范围
        const visibleLeft = -this.canvasOffsetX;
        const visibleTop = -this.canvasOffsetY;
        
        // 计算缩略图的原点偏移（基于所有节点的边界框）
        const thumbnailOriginX = (this.thumbnailWidth - boundingBox.width * this.thumbnailScale) / 2;
        const thumbnailOriginY = (this.thumbnailHeight - boundingBox.height * this.thumbnailScale) / 2;
        
        // 计算视口矩形在缩略图中的位置
        const finalViewportX = thumbnailOriginX + (visibleLeft - boundingBox.minX) * this.thumbnailScale;
        const finalViewportY = thumbnailOriginY + (visibleTop - boundingBox.minY) * this.thumbnailScale;
        
        // 创建视口矩形
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('fill', 'rgba(0, 0, 0, 0.2)');
        rect.setAttribute('stroke', '#000000');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('x', finalViewportX);
        rect.setAttribute('y', finalViewportY);
        rect.setAttribute('width', scaledViewportWidth);
        rect.setAttribute('height', scaledViewportHeight);
        rect.setAttribute('class', 'thumbnail-viewport');
        
        this.thumbnailCanvas.appendChild(rect);
    }
    
    // 自动布局功能 - 树叶逻辑
    autoLayout() {
        this.saveState();
        this.calculateNodeSizes();
        
        // 获取所有叶子节点（没有子节点的节点）
        const leafNodes = this.getLeafNodes();
        
        // 如果没有节点或只有一个节点且没有子节点，不需要布局
        if (this.nodes.length === 0 || (this.nodes.length === 1 && !this.nodes[0].children.length)) {
            return;
        }
        
        // 计算每个节点的深度
        const nodeDepths = this.calculateNodeDepths();
        
        // 按层级分组节点
        const levelNodes = this.getNodesByLevel(nodeDepths);
        
        // 计算每个层级的X坐标
        const levelXCoords = this.calculateLevelXCoords(levelNodes);
        
        // 计算叶子节点的Y坐标
        const leafYCoords = this.calculateLeafYCoords(leafNodes);
        
        // 计算所有节点的位置
        this.calculateNodePositions(this.rootNode || this.getRootNodes()[0], nodeDepths, levelXCoords, leafYCoords);
        
        // 渲染更新后的布局
        this.render();
    }
    
    // 获取所有叶子节点（没有子节点的节点）
    getLeafNodes() {
        return this.nodes.filter(node => node.children.length === 0);
    }
    
    // 计算每个节点的深度
    calculateNodeDepths() {
        const nodeDepths = new Map();
        const visited = new Set();
        
        // 首先确定初始节点（有最多连接的节点，作为思维的中心）
        let initialNode = null;
        let maxConnections = -1;
        
        this.nodes.forEach(node => {
            const connections = node.parents.length + node.children.length;
            if (connections > maxConnections) {
                maxConnections = connections;
                initialNode = node;
            }
        });
        
        // 如果没有找到初始节点，使用第一个节点
        if (!initialNode && this.nodes.length > 0) {
            initialNode = this.nodes[0];
        }
        
        if (initialNode) {
            // 正向思维：从初始节点向下处理子节点（正向深度）
            const forwardDfs = (node, depth) => {
                if (visited.has(node.id)) return;
                visited.add(node.id);
                
                // 设置当前节点的深度（正数表示正向思维的分支）
                nodeDepths.set(node.id, depth);
                
                // 递归处理子节点（深度增加）
                node.children.forEach(child => {
                    forwardDfs(child, depth + 1);
                });
            };
            
            // 反向思维：从初始节点向上处理父节点（反向深度）
            const backwardDfs = (node, depth) => {
                if (visited.has(node.id)) return;
                visited.add(node.id);
                
                // 设置当前节点的深度（负数表示反向思维的根茎）
                nodeDepths.set(node.id, depth);
                
                // 递归处理父节点（深度减少）
                node.parents.forEach(parent => {
                    backwardDfs(parent, depth - 1);
                });
            };
            
            // 设置初始节点深度为0（思维的中心）
            nodeDepths.set(initialNode.id, 0);
            visited.add(initialNode.id);
            
            // 从初始节点开始处理正向思维的子节点
            initialNode.children.forEach(child => {
                forwardDfs(child, 1);
            });
            
            // 从初始节点开始处理反向思维的父节点
            initialNode.parents.forEach(parent => {
                backwardDfs(parent, -1);
            });
        }
        
        return nodeDepths;
    }
    
    // 按层级分组节点
    getNodesByLevel(nodeDepths) {
        const levelNodes = new Map();
        
        this.nodes.forEach(node => {
            const depth = nodeDepths.get(node.id);
            if (!levelNodes.has(depth)) {
                levelNodes.set(depth, []);
            }
            levelNodes.get(depth).push(node);
        });
        
        return levelNodes;
    }
    
    // 计算每个层级的X坐标
    calculateLevelXCoords(levelNodes) {
        const nodeXCoords = new Map(); // 存储每个节点的X坐标
        const centerX = 200; // 中心节点的X坐标
        const minHorizontalSpacing = 120; // 节点之间的最小水平间距
        
        // 按层级排序
        const sortedLevels = Array.from(levelNodes.keys()).sort((a, b) => a - b);
        
        // 存储每个正向层级的最大结束X坐标
        const levelMaxRightX = new Map();
        // 存储每个反向层级的最小结束X坐标
        const levelMinLeftX = new Map();
        
        // 设置中心节点（深度为0）的X坐标
        if (levelNodes.has(0)) {
            const centerNodes = levelNodes.get(0);
            centerNodes.forEach(node => {
                nodeXCoords.set(node.id, centerX);
            });
        }
        
        // 处理正向思维的节点（深度为正，向右分布）
        const positiveLevels = sortedLevels.filter(level => level > 0);
        positiveLevels.forEach((level) => {
            const nodesInLevel = levelNodes.get(level);
            
            // 初始化当前层级的起始X坐标
            let currentLevelStartX;
            if (level === 1) {
                // 第一正向层级从中心节点右边开始
                currentLevelStartX = centerX + minHorizontalSpacing;
            } else {
                // 后续正向层级从上一层级的最大结束X坐标 + 水平间距开始
                const prevLevel = level - 1;
                const prevMaxRightX = levelMaxRightX.get(prevLevel) || centerX;
                currentLevelStartX = prevMaxRightX + minHorizontalSpacing;
            }
            
            // 计算当前层级的最大结束X坐标
            let maxRightX = currentLevelStartX;
            
            // 为当前层级的每个节点分配X坐标
            nodesInLevel.forEach(node => {
                // 设置节点的中心X坐标
                nodeXCoords.set(node.id, currentLevelStartX + node.width / 2);
                
                // 更新当前层级的最大结束X坐标
                const nodeRightX = currentLevelStartX + node.width;
                maxRightX = Math.max(maxRightX, nodeRightX);
            });
            
            // 保存当前正向层级的最大结束X坐标
            levelMaxRightX.set(level, maxRightX);
        });
        
        // 处理反向思维的节点（深度为负，向左分布）
        const negativeLevels = sortedLevels.filter(level => level < 0).sort((a, b) => b - a);
        negativeLevels.forEach((level) => {
            const nodesInLevel = levelNodes.get(level);
            
            // 初始化当前层级的起始X坐标
            let currentLevelEndX;
            if (level === -1) {
                // 第一反向层级从中心节点左边开始
                currentLevelEndX = centerX - minHorizontalSpacing;
            } else {
                // 后续反向层级从上一层级的最小结束X坐标 - 水平间距开始
                const prevLevel = level + 1;
                const prevMinLeftX = levelMinLeftX.get(prevLevel) || centerX;
                currentLevelEndX = prevMinLeftX - minHorizontalSpacing;
            }
            
            // 计算当前层级的起始X坐标
            const currentLevelStartX = currentLevelEndX - Math.max(...nodesInLevel.map(node => node.width));
            
            // 计算当前层级的最小结束X坐标
            let minLeftX = currentLevelStartX;
            
            // 为当前层级的每个节点分配X坐标
            nodesInLevel.forEach(node => {
                // 设置节点的中心X坐标
                nodeXCoords.set(node.id, currentLevelStartX + node.width / 2);
                
                // 更新当前层级的最小结束X坐标
                minLeftX = Math.min(minLeftX, currentLevelStartX);
            });
            
            // 保存当前反向层级的最小结束X坐标
            levelMinLeftX.set(level, minLeftX);
        });
        
        return nodeXCoords;
    }
    
    // 计算叶子节点的Y坐标
    calculateLeafYCoords(leafNodes) {
        const leafYCoords = new Map();
        const baseY = 200;
        const verticalEdgeSpacing = 20; // 节点边缘之间的垂直间距
        
        // 首先确定初始节点（思维的中心）
        let initialNode = null;
        let maxConnections = -1;
        
        this.nodes.forEach(node => {
            const connections = node.parents.length + node.children.length;
            if (connections > maxConnections) {
                maxConnections = connections;
                initialNode = node;
            }
        });
        
        // 如果没有找到初始节点，使用第一个节点
        if (!initialNode && this.nodes.length > 0) {
            initialNode = this.nodes[0];
        }
        
        if (initialNode) {
            // 正向思维：处理子节点分支的垂直分布
            const visitedForward = new Set();
            const orderedForwardLeafNodes = [];
            
            // 正向DFS：获取所有正向思维的叶子节点
            const forwardDfs = (node) => {
                if (visitedForward.has(node.id)) return;
                visitedForward.add(node.id);
                
                if (node.children.length === 0) {
                    orderedForwardLeafNodes.push(node);
                } else {
                    node.children.forEach(child => {
                        forwardDfs(child);
                    });
                }
            };
            
            // 从初始节点的所有子节点开始遍历正向思维的分支
            initialNode.children.forEach(child => {
                forwardDfs(child);
            });
            
            // 分配正向思维叶子节点的Y坐标
            let currentBottomYForward = baseY;
            orderedForwardLeafNodes.forEach((node) => {
                const nodeCenterY = currentBottomYForward + node.height / 2;
                leafYCoords.set(node.id, nodeCenterY);
                currentBottomYForward = currentBottomYForward + node.height + verticalEdgeSpacing;
            });
            
            // 反向思维：处理父节点根茎的垂直分布
            const visitedBackward = new Set();
            
            // 收集所有负向节点
            const allBackwardNodes = new Set();
            
            // 找出所有负向节点
            const findBackwardNodes = (node) => {
                if (visitedBackward.has(node.id) || node === initialNode) return;
                visitedBackward.add(node.id);
                allBackwardNodes.add(node);
                
                // 递归处理父节点
                node.parents.forEach(parent => {
                    findBackwardNodes(parent);
                });
            };
            
            // 从初始节点的所有父节点开始查找负向节点
            initialNode.parents.forEach(parent => {
                findBackwardNodes(parent);
            });
            
            // 清空visitedBackward，准备重新遍历
            visitedBackward.clear();
            
            // 识别负向根节点：没有父节点的负向节点
            const negativeRootNodes = Array.from(allBackwardNodes).filter(node => node.parents.length === 0);
            
            // 识别非根负向节点：有父节点的负向节点
            const negativeNonRootNodes = Array.from(allBackwardNodes).filter(node => node.parents.length > 0);
            
            // 计算负向根节点的Y坐标
            if (negativeRootNodes.length > 0) {
                // 为负向根节点分配固定间距的Y坐标
                // 计算根节点的基准Y坐标：基于其子节点的Y坐标平均值
                let baseYRoot;
                
                // 收集所有负向根节点子节点的Y坐标
                const childYs = [];
                negativeRootNodes.forEach(node => {
                    node.children.forEach(child => {
                        if (leafYCoords.has(child.id)) {
                            childYs.push(leafYCoords.get(child.id));
                        } else if (child.y) {
                            childYs.push(child.y);
                        } else {
                            // 使用默认Y坐标
                            childYs.push(baseY + child.height / 2);
                        }
                    });
                });
                
                if (childYs.length > 0) {
                    // 计算子节点Y坐标的平均值作为根节点的基准Y坐标
                    baseYRoot = childYs.reduce((sum, y) => sum + y, 0) / childYs.length;
                } else {
                    // 使用默认基准Y坐标
                    baseYRoot = baseY + negativeRootNodes[0].height / 2;
                }
                
                // 计算根节点的总高度和总间距
                const totalHeight = negativeRootNodes.reduce((sum, node) => sum + node.height, 0);
                const totalSpacing = (negativeRootNodes.length - 1) * verticalEdgeSpacing;
                const totalRootHeight = totalHeight + totalSpacing;
                
                // 计算起始Y坐标，使所有根节点居中于基准Y坐标
                let currentBottomY = baseYRoot - totalRootHeight / 2;
                
                // 为每个负向根节点分配Y坐标
                negativeRootNodes.forEach(node => {
                    const nodeCenterY = currentBottomY + node.height / 2;
                    leafYCoords.set(node.id, nodeCenterY);
                    currentBottomY = currentBottomY + node.height + verticalEdgeSpacing;
                });
            }
            
            // 计算负向节点的Y坐标
            // 实现父节点优先遍历，让子节点的Y坐标成为父节点Y坐标的平均值
            if (negativeRootNodes.length > 0 || negativeNonRootNodes.length > 0) {
                // 创建一个包含所有负向节点的集合
                const allNegativeNodes = new Set([...negativeRootNodes, ...negativeNonRootNodes]);
                
                // 使用DFS遍历负向节点，父节点优先
                const dfsParentFirst = (node) => {
                    if (visitedBackward.has(node.id)) return;
                    visitedBackward.add(node.id);
                    
                    // 先处理当前节点（如果是负向根节点或已有父节点Y坐标）
                    if (node.parents.length === 0) {
                        // 负向根节点已经有Y坐标了，跳过
                        return;
                    }
                    
                    // 收集父节点的Y坐标
                    const parentYs = [];
                    node.parents.forEach(parent => {
                        if (leafYCoords.has(parent.id)) {
                            parentYs.push(leafYCoords.get(parent.id));
                        }
                    });
                    
                    // 如果所有父节点都有Y坐标，计算当前节点的Y坐标
                    if (parentYs.length === node.parents.length && parentYs.length > 0) {
                        // 子节点的Y坐标是父节点Y坐标的平均值
                        const averageY = parentYs.reduce((sum, y) => sum + y, 0) / parentYs.length;
                        leafYCoords.set(node.id, averageY);
                        
                        // 递归处理子节点
                        node.children.forEach(child => {
                            if (allNegativeNodes.has(child)) {
                                dfsParentFirst(child);
                            }
                        });
                    }
                };
                
                // 首先处理所有负向根节点（已经分配了Y坐标）
                // 然后从负向根节点开始，按父节点优先的顺序处理所有负向节点
                negativeRootNodes.forEach(rootNode => {
                    // 处理根节点的子节点
                    rootNode.children.forEach(child => {
                        if (allNegativeNodes.has(child)) {
                            dfsParentFirst(child);
                        }
                    });
                });
                
                // 再次遍历所有负向节点，确保所有节点都有Y坐标
                // 处理可能的循环依赖或未处理的节点
                allNegativeNodes.forEach(node => {
                    if (!leafYCoords.has(node.id)) {
                        // 如果节点没有Y坐标，尝试基于其父节点计算
                        const parentYs = [];
                        node.parents.forEach(parent => {
                            if (leafYCoords.has(parent.id)) {
                                parentYs.push(leafYCoords.get(parent.id));
                            }
                        });
                        
                        if (parentYs.length > 0) {
                            const averageY = parentYs.reduce((sum, y) => sum + y, 0) / parentYs.length;
                            leafYCoords.set(node.id, averageY);
                        } else {
                            // 使用默认Y坐标
                            leafYCoords.set(node.id, baseY + node.height / 2);
                        }
                    }
                });
            }
        }
        
        return leafYCoords;
    }
    
    // 计算所有节点的位置
    calculateNodePositions(rootNode, nodeDepths, nodeXCoords, leafYCoords) {
        // 首先确定初始节点（思维的中心）
        let initialNode = null;
        let maxConnections = -1;
        
        this.nodes.forEach(node => {
            const connections = node.parents.length + node.children.length;
            if (connections > maxConnections) {
                maxConnections = connections;
                initialNode = node;
            }
        });
        
        // 如果没有找到初始节点，使用第一个节点
        if (!initialNode && this.nodes.length > 0) {
            initialNode = this.nodes[0];
        }
        
        if (initialNode) {
            // 设置初始节点的位置
            initialNode.x = nodeXCoords.get(initialNode.id);
            
            // 初始节点的Y坐标基于其所有直接连接的节点的平均Y坐标
            let initialY = 200; // 默认值
            const connectedNodeYs = [];
            
            // 收集所有直接连接节点的Y坐标
            [...initialNode.children, ...initialNode.parents].forEach(node => {
                if (leafYCoords.has(node.id)) {
                    // 如果节点在leafYCoords中（叶子节点或根茎节点），使用预计算的Y坐标
                    connectedNodeYs.push(leafYCoords.get(node.id));
                } else {
                    // 否则使用节点当前的Y坐标（非叶子节点的临时值）
                    connectedNodeYs.push(node.y);
                }
            });
            
            // 计算平均值
            if (connectedNodeYs.length > 0) {
                initialY = connectedNodeYs.reduce((sum, y) => sum + y, 0) / connectedNodeYs.length;
            }
            
            initialNode.y = initialY;
            
            // 设置所有其他节点的位置
            this.nodes.forEach(node => {
                // 跳过初始节点，已经设置过了
                if (node.id === initialNode.id) return;
                
                // 设置节点的X坐标
                node.x = nodeXCoords.get(node.id);
                
                // 设置节点的Y坐标
                if (leafYCoords.has(node.id)) {
                    // 如果有预计算的Y坐标，则使用它（适用于所有叶子节点和根茎节点）
                    node.y = leafYCoords.get(node.id);
                } else {
                    // 否则根据连接的节点计算Y坐标
                    let averageY = initialY; // 默认使用初始节点的Y坐标
                    
                    const depth = nodeDepths.get(node.id);
                    if (depth > 0) {
                        // 正向思维节点：根据子节点计算Y坐标
                        if (node.children.length > 0) {
                            const childYs = node.children.map(child => child.y);
                            if (childYs.length > 0) {
                                averageY = childYs.reduce((sum, y) => sum + y, 0) / childYs.length;
                            }
                        }
                    } else if (depth < 0) {
                        // 反向思维节点：根据父节点计算Y坐标
                        if (node.parents.length > 0) {
                            const parentYs = node.parents.map(parent => parent.y);
                            if (parentYs.length > 0) {
                                averageY = parentYs.reduce((sum, y) => sum + y, 0) / parentYs.length;
                            }
                        }
                    }
                    
                    node.y = averageY;
                }
            });
        }
    }
    
    // 处理缩略图点击事件
    thumbnailClick(e) {
        const rect = this.thumbnailCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // 获取主画布的可见区域尺寸
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // 计算所有节点的边界框
        const nodesBoundingBox = this.calculateNodesBoundingBox();
        
        // 计算视口矩形的世界坐标边界
        const viewportLeft = -this.canvasOffsetX;
        const viewportTop = -this.canvasOffsetY;
        const viewportRight = -this.canvasOffsetX + canvasRect.width;
        const viewportBottom = -this.canvasOffsetY + canvasRect.height;
        
        // 计算包含所有节点和视口矩形的总边界框
        // 从节点边界框开始
        let totalMinX = nodesBoundingBox.minX;
        let totalMinY = nodesBoundingBox.minY;
        let totalMaxX = nodesBoundingBox.maxX;
        let totalMaxY = nodesBoundingBox.maxY;
        
        // 扩展总边界框以包含视口矩形的所有边界
        totalMinX = Math.min(totalMinX, viewportLeft);
        totalMinY = Math.min(totalMinY, viewportTop);
        totalMaxX = Math.max(totalMaxX, viewportRight);
        totalMaxY = Math.max(totalMaxY, viewportBottom);
        
        // 添加额外的内边距，与renderThumbnail保持一致
        const extraPadding = 15;
        totalMinX -= extraPadding;
        totalMinY -= extraPadding;
        totalMaxX += extraPadding;
        totalMaxY += extraPadding;
        
        // 确保总边界框不为空
        if (totalMinX >= totalMaxX) {
            totalMaxX = totalMinX + 100;
        }
        if (totalMinY >= totalMaxY) {
            totalMaxY = totalMinY + 100;
        }
        
        const totalWidth = totalMaxX - totalMinX;
        const totalHeight = totalMaxY - totalMinY;
        
        // 计算缩略图的原点偏移（基于总边界框，与renderThumbnail保持一致）
        const thumbnailOriginX = (this.thumbnailWidth - totalWidth * this.thumbnailScale) / 2;
        const thumbnailOriginY = (this.thumbnailHeight - totalHeight * this.thumbnailScale) / 2;
        
        // 将缩略图点击位置转换为世界坐标
        const worldX = totalMinX + (clickX - thumbnailOriginX) / this.thumbnailScale;
        const worldY = totalMinY + (clickY - thumbnailOriginY) / this.thumbnailScale;
        
        // 更新主画布的偏移量，使目标点位于视口中心
        this.canvasOffsetX = -worldX + canvasRect.width / 2;
        this.canvasOffsetY = -worldY + canvasRect.height / 2;
        
        // 重新渲染主画布和缩略图
        this.render();
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const mindMap = new MindMap('mindMapCanvas');
    window.mindMap = mindMap; // 方便调试
});
