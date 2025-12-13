import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// ==================== API Routes ====================

// Get all categories
app.get('/api/categories', async (c) => {
  const { DB } = c.env
  const result = await DB.prepare('SELECT * FROM categories ORDER BY name').all()
  return c.json(result.results)
})

// Get all memories with pagination
app.get('/api/memories', async (c) => {
  const { DB } = c.env
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const category = c.req.query('category')
  const search = c.req.query('search')
  const offset = (page - 1) * limit

  let query = `
    SELECT m.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM memories m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE 1=1
  `
  const params: any[] = []

  if (category) {
    query += ' AND m.category_id = ?'
    params.push(parseInt(category))
  }

  if (search) {
    query += ' AND (m.title LIKE ? OR m.description LIKE ? OR m.content LIKE ?)'
    const searchTerm = `%${search}%`
    params.push(searchTerm, searchTerm, searchTerm)
  }

  query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const result = await DB.prepare(query).bind(...params).all()
  
  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM memories WHERE 1=1'
  const countParams: any[] = []
  if (category) {
    countQuery += ' AND category_id = ?'
    countParams.push(parseInt(category))
  }
  if (search) {
    countQuery += ' AND (title LIKE ? OR description LIKE ? OR content LIKE ?)'
    const searchTerm = `%${search}%`
    countParams.push(searchTerm, searchTerm, searchTerm)
  }
  const countResult = await DB.prepare(countQuery).bind(...countParams).first()

  return c.json({
    data: result.results,
    pagination: {
      page,
      limit,
      total: countResult?.total || 0,
      totalPages: Math.ceil((countResult?.total || 0) / limit)
    }
  })
})

// Get single memory by ID
app.get('/api/memories/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  
  const memory = await DB.prepare(`
    SELECT m.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM memories m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.id = ?
  `).bind(id).first()

  if (!memory) {
    return c.json({ error: 'Memory not found' }, 404)
  }

  // Get connected memories
  const connections = await DB.prepare(`
    SELECT m.*, conn.connection_type, conn.strength
    FROM connections conn
    JOIN memories m ON (conn.memory_id_2 = m.id OR conn.memory_id_1 = m.id)
    WHERE (conn.memory_id_1 = ? OR conn.memory_id_2 = ?) AND m.id != ?
  `).bind(id, id, id).all()

  return c.json({
    ...memory,
    connections: connections.results
  })
})

// Create new memory
app.post('/api/memories', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  
  const { 
    user_id = 1, 
    category_id, 
    title, 
    description, 
    content,
    file_url,
    file_type,
    tags,
    importance_score = 5,
    original_date
  } = body

  if (!title) {
    return c.json({ error: 'Title is required' }, 400)
  }

  const result = await DB.prepare(`
    INSERT INTO memories (
      user_id, category_id, title, description, content,
      file_url, file_type, tags, importance_score, original_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user_id,
    category_id || null,
    title,
    description || null,
    content || null,
    file_url || null,
    file_type || null,
    tags ? JSON.stringify(tags) : null,
    importance_score,
    original_date || null
  ).run()

  const newMemory = await DB.prepare('SELECT * FROM memories WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first()

  return c.json(newMemory, 201)
})

// Update memory
app.put('/api/memories/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()

  const { 
    category_id, 
    title, 
    description, 
    content,
    file_url,
    file_type,
    tags,
    ai_summary,
    ai_sentiment,
    ai_keywords,
    importance_score,
    is_archived,
    original_date
  } = body

  const updates: string[] = []
  const params: any[] = []

  if (category_id !== undefined) {
    updates.push('category_id = ?')
    params.push(category_id)
  }
  if (title !== undefined) {
    updates.push('title = ?')
    params.push(title)
  }
  if (description !== undefined) {
    updates.push('description = ?')
    params.push(description)
  }
  if (content !== undefined) {
    updates.push('content = ?')
    params.push(content)
  }
  if (file_url !== undefined) {
    updates.push('file_url = ?')
    params.push(file_url)
  }
  if (file_type !== undefined) {
    updates.push('file_type = ?')
    params.push(file_type)
  }
  if (tags !== undefined) {
    updates.push('tags = ?')
    params.push(JSON.stringify(tags))
  }
  if (ai_summary !== undefined) {
    updates.push('ai_summary = ?')
    params.push(ai_summary)
  }
  if (ai_sentiment !== undefined) {
    updates.push('ai_sentiment = ?')
    params.push(ai_sentiment)
  }
  if (ai_keywords !== undefined) {
    updates.push('ai_keywords = ?')
    params.push(JSON.stringify(ai_keywords))
  }
  if (importance_score !== undefined) {
    updates.push('importance_score = ?')
    params.push(importance_score)
  }
  if (is_archived !== undefined) {
    updates.push('is_archived = ?')
    params.push(is_archived ? 1 : 0)
  }
  if (original_date !== undefined) {
    updates.push('original_date = ?')
    params.push(original_date)
  }

  updates.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)

  if (updates.length === 1) {
    return c.json({ error: 'No fields to update' }, 400)
  }

  await DB.prepare(`
    UPDATE memories 
    SET ${updates.join(', ')}
    WHERE id = ?
  `).bind(...params).run()

  const updatedMemory = await DB.prepare('SELECT * FROM memories WHERE id = ?')
    .bind(id)
    .first()

  return c.json(updatedMemory)
})

// Delete memory
app.delete('/api/memories/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  await DB.prepare('DELETE FROM memories WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// Get statistics
app.get('/api/statistics', async (c) => {
  const { DB } = c.env

  const totalMemories = await DB.prepare('SELECT COUNT(*) as count FROM memories').first()
  const categoriesCount = await DB.prepare(`
    SELECT c.name, c.icon, c.color, COUNT(m.id) as count
    FROM categories c
    LEFT JOIN memories m ON c.id = m.category_id
    GROUP BY c.id, c.name, c.icon, c.color
    ORDER BY count DESC
  `).all()
  
  const recentMemories = await DB.prepare(`
    SELECT m.*, c.name as category_name, c.icon as category_icon
    FROM memories m
    LEFT JOIN categories c ON m.category_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 5
  `).all()

  const sentimentStats = await DB.prepare(`
    SELECT ai_sentiment, COUNT(*) as count
    FROM memories
    WHERE ai_sentiment IS NOT NULL
    GROUP BY ai_sentiment
  `).all()

  return c.json({
    total: totalMemories?.count || 0,
    byCategory: categoriesCount.results,
    recent: recentMemories.results,
    sentiments: sentimentStats.results
  })
})

// Create connection between memories
app.post('/api/connections', async (c) => {
  const { DB } = c.env
  const { memory_id_1, memory_id_2, connection_type = 'related', strength = 5 } = await c.req.json()

  if (!memory_id_1 || !memory_id_2) {
    return c.json({ error: 'Both memory IDs are required' }, 400)
  }

  const result = await DB.prepare(`
    INSERT OR IGNORE INTO connections (memory_id_1, memory_id_2, connection_type, strength)
    VALUES (?, ?, ?, ?)
  `).bind(memory_id_1, memory_id_2, connection_type, strength).run()

  return c.json({ success: true, id: result.meta.last_row_id }, 201)
})

// ==================== Frontend ====================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MemoryLink - AI 기반 디지털 유품 정리 서비스</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          .memory-card {
            transition: all 0.3s ease;
          }
          .memory-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
          .category-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
          }
          .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <header class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <i class="fas fa-heart text-3xl text-purple-600"></i>
                        <h1 class="text-2xl font-bold text-gray-900">MemoryLink</h1>
                    </div>
                    <nav class="flex space-x-4">
                        <button onclick="showView('dashboard')" class="nav-btn px-4 py-2 text-gray-700 hover:text-purple-600 transition">
                            <i class="fas fa-home mr-2"></i>대시보드
                        </button>
                        <button onclick="showView('memories')" class="nav-btn px-4 py-2 text-gray-700 hover:text-purple-600 transition">
                            <i class="fas fa-images mr-2"></i>추억 보기
                        </button>
                        <button onclick="showAddMemory()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                            <i class="fas fa-plus mr-2"></i>추억 추가
                        </button>
                    </nav>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Dashboard View -->
            <div id="dashboard-view" class="view-section">
                <h2 class="text-3xl font-bold text-gray-900 mb-6">대시보드</h2>
                
                <!-- Statistics -->
                <div id="statistics" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="stat-card text-white p-6 rounded-xl">
                        <i class="fas fa-database text-3xl mb-2"></i>
                        <p class="text-sm opacity-90">총 추억</p>
                        <p id="total-memories" class="text-4xl font-bold">0</p>
                    </div>
                </div>

                <!-- Categories -->
                <div class="bg-white rounded-xl shadow-sm p-6 mb-8">
                    <h3 class="text-xl font-bold text-gray-900 mb-4">카테고리별 분포</h3>
                    <div id="categories-chart" class="space-y-3"></div>
                </div>

                <!-- Recent Memories -->
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <h3 class="text-xl font-bold text-gray-900 mb-4">최근 추억</h3>
                    <div id="recent-memories" class="space-y-3"></div>
                </div>
            </div>

            <!-- Memories View -->
            <div id="memories-view" class="view-section hidden">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-3xl font-bold text-gray-900">내 추억</h2>
                    <div class="flex space-x-4">
                        <select id="category-filter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            <option value="">모든 카테고리</option>
                        </select>
                        <input id="search-input" type="text" placeholder="검색..." class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                    </div>
                </div>
                
                <div id="memories-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                
                <!-- Pagination -->
                <div id="pagination" class="flex justify-center mt-8 space-x-2"></div>
            </div>

            <!-- Add/Edit Memory Modal -->
            <div id="memory-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
                <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h3 id="modal-title" class="text-2xl font-bold text-gray-900">추억 추가</h3>
                            <button onclick="closeModal()" class="text-gray-500 hover:text-gray-700">
                                <i class="fas fa-times text-2xl"></i>
                            </button>
                        </div>
                        
                        <form id="memory-form" class="space-y-4">
                            <input type="hidden" id="memory-id">
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">제목 *</label>
                                <input type="text" id="title" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                                <select id="category" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                                    <option value="">선택하세요</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">설명</label>
                                <textarea id="description" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">내용</label>
                                <textarea id="content" rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">중요도 (1-10)</label>
                                <input type="range" id="importance-score" min="1" max="10" value="5" class="w-full">
                                <div class="flex justify-between text-xs text-gray-500">
                                    <span>1</span>
                                    <span id="importance-value">5</span>
                                    <span>10</span>
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">원본 날짜</label>
                                <input type="datetime-local" id="original-date" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            </div>
                            
                            <div class="flex justify-end space-x-3 pt-4">
                                <button type="button" onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                                    취소
                                </button>
                                <button type="submit" class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Memory Detail Modal -->
            <div id="detail-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
                <div class="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="p-6" id="detail-content">
                        <!-- Content loaded dynamically -->
                    </div>
                </div>
            </div>
        </main>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            const API_BASE = '/api';
            let currentPage = 1;
            let currentView = 'dashboard';
            let categories = [];

            // Initialize app
            async function init() {
                await loadCategories();
                await loadStatistics();
                showView('dashboard');
                
                // Event listeners
                document.getElementById('category-filter').addEventListener('change', () => {
                    currentPage = 1;
                    loadMemories();
                });
                
                document.getElementById('search-input').addEventListener('input', debounce(() => {
                    currentPage = 1;
                    loadMemories();
                }, 500));
                
                document.getElementById('importance-score').addEventListener('input', (e) => {
                    document.getElementById('importance-value').textContent = e.target.value;
                });
                
                document.getElementById('memory-form').addEventListener('submit', handleMemorySubmit);
            }

            // Load categories
            async function loadCategories() {
                try {
                    const response = await axios.get(\`\${API_BASE}/categories\`);
                    categories = response.data;
                    
                    // Populate category selects
                    const categorySelect = document.getElementById('category');
                    const categoryFilter = document.getElementById('category-filter');
                    
                    categories.forEach(cat => {
                        const option = new Option(\`\${cat.icon} \${cat.name}\`, cat.id);
                        categorySelect.add(option.cloneNode(true));
                        categoryFilter.add(option);
                    });
                } catch (error) {
                    console.error('Error loading categories:', error);
                }
            }

            // Load statistics
            async function loadStatistics() {
                try {
                    const response = await axios.get(\`\${API_BASE}/statistics\`);
                    const stats = response.data;
                    
                    document.getElementById('total-memories').textContent = stats.total;
                    
                    // Categories chart
                    const categoriesChart = document.getElementById('categories-chart');
                    categoriesChart.innerHTML = stats.byCategory.map(cat => \`
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <span class="text-2xl">\${cat.icon}</span>
                                <span class="font-medium text-gray-700">\${cat.name}</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <div class="w-32 bg-gray-200 rounded-full h-2">
                                    <div class="h-2 rounded-full" style="width: \${(cat.count / stats.total * 100) || 0}%; background-color: \${cat.color}"></div>
                                </div>
                                <span class="text-sm font-semibold text-gray-600">\${cat.count}</span>
                            </div>
                        </div>
                    \`).join('');
                    
                    // Recent memories
                    const recentMemories = document.getElementById('recent-memories');
                    recentMemories.innerHTML = stats.recent.map(memory => \`
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition" onclick="showMemoryDetail(\${memory.id})">
                            <div class="flex items-center space-x-3">
                                <span class="text-xl">\${memory.category_icon || '📦'}</span>
                                <div>
                                    <p class="font-medium text-gray-900">\${memory.title}</p>
                                    <p class="text-sm text-gray-500">\${new Date(memory.created_at).toLocaleDateString('ko-KR')}</p>
                                </div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-400"></i>
                        </div>
                    \`).join('');
                } catch (error) {
                    console.error('Error loading statistics:', error);
                }
            }

            // Load memories with pagination
            async function loadMemories() {
                try {
                    const category = document.getElementById('category-filter').value;
                    const search = document.getElementById('search-input').value;
                    
                    const params = {
                        page: currentPage,
                        limit: 12,
                        ...(category && { category }),
                        ...(search && { search })
                    };
                    
                    const response = await axios.get(\`\${API_BASE}/memories\`, { params });
                    const { data, pagination } = response.data;
                    
                    // Render memories grid
                    const grid = document.getElementById('memories-grid');
                    grid.innerHTML = data.map(memory => \`
                        <div class="memory-card bg-white rounded-xl shadow-sm p-6 cursor-pointer" onclick="showMemoryDetail(\${memory.id})">
                            <div class="flex items-start justify-between mb-3">
                                <span class="category-badge text-2xl">\${memory.category_icon || '📦'}</span>
                                <div class="flex items-center space-x-1">
                                    \${Array(memory.importance_score || 5).fill('⭐').join('')}
                                </div>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 mb-2">\${memory.title}</h3>
                            <p class="text-sm text-gray-600 mb-4 line-clamp-2">\${memory.description || ''}</p>
                            <div class="flex items-center justify-between text-xs text-gray-500">
                                <span>\${new Date(memory.created_at).toLocaleDateString('ko-KR')}</span>
                                <span class="category-badge px-2 py-1 rounded-full" style="background-color: \${memory.category_color}20; color: \${memory.category_color}">
                                    \${memory.category_name || '미분류'}
                                </span>
                            </div>
                        </div>
                    \`).join('');
                    
                    // Render pagination
                    renderPagination(pagination);
                } catch (error) {
                    console.error('Error loading memories:', error);
                }
            }

            // Render pagination
            function renderPagination(pagination) {
                const paginationEl = document.getElementById('pagination');
                const pages = [];
                
                for (let i = 1; i <= pagination.totalPages; i++) {
                    pages.push(\`
                        <button onclick="goToPage(\${i})" class="px-4 py-2 \${i === pagination.page ? 'bg-purple-600 text-white' : 'bg-white text-gray-700'} rounded-lg border hover:bg-purple-100 transition">
                            \${i}
                        </button>
                    \`);
                }
                
                paginationEl.innerHTML = pages.join('');
            }

            function goToPage(page) {
                currentPage = page;
                loadMemories();
            }

            // Show memory detail
            async function showMemoryDetail(id) {
                try {
                    const response = await axios.get(\`\${API_BASE}/memories/\${id}\`);
                    const memory = response.data;
                    
                    const content = document.getElementById('detail-content');
                    content.innerHTML = \`
                        <div class="flex justify-between items-start mb-6">
                            <div class="flex items-center space-x-3">
                                <span class="text-3xl">\${memory.category_icon || '📦'}</span>
                                <div>
                                    <h3 class="text-2xl font-bold text-gray-900">\${memory.title}</h3>
                                    <p class="text-sm text-gray-500">\${new Date(memory.created_at).toLocaleDateString('ko-KR')}</p>
                                </div>
                            </div>
                            <div class="flex space-x-2">
                                <button onclick="editMemory(\${memory.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteMemory(\${memory.id})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                                    <i class="fas fa-trash"></i>
                                </button>
                                <button onclick="closeDetailModal()" class="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="space-y-4">
                            <div>
                                <h4 class="text-sm font-semibold text-gray-700 mb-2">설명</h4>
                                <p class="text-gray-600">\${memory.description || '없음'}</p>
                            </div>
                            
                            <div>
                                <h4 class="text-sm font-semibold text-gray-700 mb-2">내용</h4>
                                <p class="text-gray-600 whitespace-pre-wrap">\${memory.content || '없음'}</p>
                            </div>
                            
                            <div class="flex items-center space-x-4 text-sm">
                                <div>
                                    <span class="text-gray-700 font-medium">중요도:</span>
                                    <span class="ml-2">\${Array(memory.importance_score || 5).fill('⭐').join('')}</span>
                                </div>
                                \${memory.ai_sentiment ? \`
                                    <div>
                                        <span class="text-gray-700 font-medium">감정:</span>
                                        <span class="ml-2 px-2 py-1 rounded-full text-xs \${memory.ai_sentiment === 'positive' ? 'bg-green-100 text-green-700' : memory.ai_sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}">
                                            \${memory.ai_sentiment}
                                        </span>
                                    </div>
                                \` : ''}
                            </div>
                            
                            \${memory.ai_summary ? \`
                                <div class="bg-blue-50 p-4 rounded-lg">
                                    <h4 class="text-sm font-semibold text-blue-900 mb-2">
                                        <i class="fas fa-robot mr-2"></i>AI 요약
                                    </h4>
                                    <p class="text-blue-800">\${memory.ai_summary}</p>
                                </div>
                            \` : ''}
                            
                            \${memory.connections && memory.connections.length > 0 ? \`
                                <div>
                                    <h4 class="text-sm font-semibold text-gray-700 mb-2">연결된 추억</h4>
                                    <div class="space-y-2">
                                        \${memory.connections.map(conn => \`
                                            <div class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition" onclick="showMemoryDetail(\${conn.id})">
                                                <p class="font-medium text-gray-900">\${conn.title}</p>
                                                <p class="text-xs text-gray-500">\${conn.connection_type} (강도: \${conn.strength}/10)</p>
                                            </div>
                                        \`).join('')}
                                    </div>
                                </div>
                            \` : ''}
                        </div>
                    \`;
                    
                    document.getElementById('detail-modal').classList.remove('hidden');
                    document.getElementById('detail-modal').classList.add('flex');
                } catch (error) {
                    console.error('Error loading memory detail:', error);
                    alert('추억을 불러오는데 실패했습니다.');
                }
            }

            function closeDetailModal() {
                document.getElementById('detail-modal').classList.add('hidden');
                document.getElementById('detail-modal').classList.remove('flex');
            }

            // Show add memory modal
            function showAddMemory() {
                document.getElementById('modal-title').textContent = '추억 추가';
                document.getElementById('memory-form').reset();
                document.getElementById('memory-id').value = '';
                document.getElementById('memory-modal').classList.remove('hidden');
                document.getElementById('memory-modal').classList.add('flex');
            }

            // Edit memory
            async function editMemory(id) {
                try {
                    const response = await axios.get(\`\${API_BASE}/memories/\${id}\`);
                    const memory = response.data;
                    
                    document.getElementById('modal-title').textContent = '추억 수정';
                    document.getElementById('memory-id').value = memory.id;
                    document.getElementById('title').value = memory.title;
                    document.getElementById('category').value = memory.category_id || '';
                    document.getElementById('description').value = memory.description || '';
                    document.getElementById('content').value = memory.content || '';
                    document.getElementById('importance-score').value = memory.importance_score || 5;
                    document.getElementById('importance-value').textContent = memory.importance_score || 5;
                    
                    if (memory.original_date) {
                        const date = new Date(memory.original_date);
                        document.getElementById('original-date').value = date.toISOString().slice(0, 16);
                    }
                    
                    closeDetailModal();
                    document.getElementById('memory-modal').classList.remove('hidden');
                    document.getElementById('memory-modal').classList.add('flex');
                } catch (error) {
                    console.error('Error loading memory:', error);
                    alert('추억을 불러오는데 실패했습니다.');
                }
            }

            // Handle memory form submit
            async function handleMemorySubmit(e) {
                e.preventDefault();
                
                const id = document.getElementById('memory-id').value;
                const data = {
                    title: document.getElementById('title').value,
                    category_id: document.getElementById('category').value ? parseInt(document.getElementById('category').value) : null,
                    description: document.getElementById('description').value,
                    content: document.getElementById('content').value,
                    importance_score: parseInt(document.getElementById('importance-score').value),
                    original_date: document.getElementById('original-date').value || null
                };
                
                try {
                    if (id) {
                        await axios.put(\`\${API_BASE}/memories/\${id}\`, data);
                    } else {
                        await axios.post(\`\${API_BASE}/memories\`, data);
                    }
                    
                    closeModal();
                    if (currentView === 'memories') {
                        loadMemories();
                    } else {
                        loadStatistics();
                    }
                    alert('저장되었습니다!');
                } catch (error) {
                    console.error('Error saving memory:', error);
                    alert('저장에 실패했습니다.');
                }
            }

            // Delete memory
            async function deleteMemory(id) {
                if (!confirm('정말 삭제하시겠습니까?')) return;
                
                try {
                    await axios.delete(\`\${API_BASE}/memories/\${id}\`);
                    closeDetailModal();
                    if (currentView === 'memories') {
                        loadMemories();
                    } else {
                        loadStatistics();
                    }
                    alert('삭제되었습니다.');
                } catch (error) {
                    console.error('Error deleting memory:', error);
                    alert('삭제에 실패했습니다.');
                }
            }

            function closeModal() {
                document.getElementById('memory-modal').classList.add('hidden');
                document.getElementById('memory-modal').classList.remove('flex');
            }

            // Show view
            function showView(view) {
                currentView = view;
                document.getElementById('dashboard-view').classList.toggle('hidden', view !== 'dashboard');
                document.getElementById('memories-view').classList.toggle('hidden', view !== 'memories');
                
                if (view === 'memories') {
                    loadMemories();
                } else if (view === 'dashboard') {
                    loadStatistics();
                }
            }

            // Utility: debounce
            function debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            }

            // Initialize on page load
            init();
        </script>
    </body>
    </html>
  `)
})

export default app
