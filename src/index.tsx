import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  OPENAI_API_KEY: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// ==================== Helper Functions ====================

// AI Analysis with OpenAI
async function analyzeWithAI(text: string, apiKey?: string) {
  if (!apiKey) {
    return {
      summary: '(AI 분석을 위해 OpenAI API 키가 필요합니다)',
      sentiment: 'neutral',
      keywords: []
    }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '당신은 디지털 추억을 분석하는 AI입니다. 주어진 텍스트를 분석하여 JSON 형식으로 요약(summary), 감정(sentiment: positive/negative/neutral), 키워드(keywords: 배열)를 반환하세요.'
          },
          {
            role: 'user',
            content: `다음 텍스트를 분석해주세요: ${text}`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    })

    if (!response.ok) {
      throw new Error('OpenAI API 호출 실패')
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content)
      return {
        summary: parsed.summary || text.substring(0, 100),
        sentiment: parsed.sentiment || 'neutral',
        keywords: parsed.keywords || []
      }
    } catch {
      // Fallback if not valid JSON
      return {
        summary: content.substring(0, 100),
        sentiment: 'neutral',
        keywords: []
      }
    }
  } catch (error) {
    console.error('AI 분석 오류:', error)
    return {
      summary: text.substring(0, 100),
      sentiment: 'neutral',
      keywords: []
    }
  }
}

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

// Upload file to R2
app.post('/api/upload', async (c) => {
  const { BUCKET } = c.env
  
  if (!BUCKET) {
    return c.json({ error: 'R2 버킷이 설정되지 않았습니다. 로컬에서는 파일 URL을 직접 입력해주세요.' }, 400)
  }

  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()
    const key = `uploads/${timestamp}-${randomStr}.${extension}`

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer()
    await BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    })

    // Return public URL (you'll need to set up a public domain for R2)
    const fileUrl = `/api/files/${key}`

    return c.json({
      success: true,
      url: fileUrl,
      key: key,
      name: file.name,
      type: file.type,
      size: file.size
    })
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'Upload failed' }, 500)
  }
})

// Get file from R2
app.get('/api/files/*', async (c) => {
  const { BUCKET } = c.env
  
  if (!BUCKET) {
    return c.text('R2 버킷이 설정되지 않았습니다', 404)
  }

  const key = c.req.path.replace('/api/files/', '')
  
  try {
    const object = await BUCKET.get(key)
    
    if (!object) {
      return c.text('File not found', 404)
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  } catch (error) {
    console.error('File retrieval error:', error)
    return c.text('Error retrieving file', 500)
  }
})

// Create new memory with AI analysis
app.post('/api/memories', async (c) => {
  const { DB, OPENAI_API_KEY } = c.env
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
    original_date,
    auto_analyze = true
  } = body

  if (!title) {
    return c.json({ error: 'Title is required' }, 400)
  }

  // AI Analysis
  let ai_summary = null
  let ai_sentiment = null
  let ai_keywords = null

  if (auto_analyze && (description || content)) {
    const textToAnalyze = `${title}. ${description || ''}. ${content || ''}`
    const analysis = await analyzeWithAI(textToAnalyze, OPENAI_API_KEY)
    ai_summary = analysis.summary
    ai_sentiment = analysis.sentiment
    ai_keywords = JSON.stringify(analysis.keywords)
  }

  const result = await DB.prepare(`
    INSERT INTO memories (
      user_id, category_id, title, description, content,
      file_url, file_type, tags, ai_summary, ai_sentiment, ai_keywords,
      importance_score, original_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user_id,
    category_id || null,
    title,
    description || null,
    content || null,
    file_url || null,
    file_type || null,
    tags ? JSON.stringify(tags) : null,
    ai_summary,
    ai_sentiment,
    ai_keywords,
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

// Export data as JSON
app.get('/api/export', async (c) => {
  const { DB } = c.env
  
  const memories = await DB.prepare('SELECT * FROM memories ORDER BY created_at DESC').all()
  const categories = await DB.prepare('SELECT * FROM categories').all()
  const connections = await DB.prepare('SELECT * FROM connections').all()
  
  const exportData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    data: {
      memories: memories.results,
      categories: categories.results,
      connections: connections.results
    }
  }
  
  return c.json(exportData)
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
            position: relative;
            overflow: hidden;
          }
          .memory-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          }
          .memory-card img {
            width: 100%;
            height: 200px;
            object-fit: cover;
          }
          .category-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
          }
          .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .upload-area {
            border: 2px dashed #cbd5e0;
            transition: all 0.3s;
          }
          .upload-area:hover, .upload-area.dragover {
            border-color: #667eea;
            background-color: #f7fafc;
          }
          .timeline-item {
            position: relative;
            padding-left: 2rem;
          }
          .timeline-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, #667eea, #764ba2);
          }
          .timeline-dot {
            position: absolute;
            left: -6px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #667eea;
            border: 3px solid white;
          }
          .modal {
            backdrop-filter: blur(4px);
          }
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- Header -->
        <header class="bg-white shadow-sm sticky top-0 z-40">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <i class="fas fa-heart text-3xl text-purple-600"></i>
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900">MemoryLink</h1>
                            <p class="text-xs text-gray-500">AI 기반 디지털 유품 관리</p>
                        </div>
                    </div>
                    <nav class="flex space-x-2">
                        <button onclick="showView('dashboard')" class="nav-btn px-3 py-2 text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition">
                            <i class="fas fa-home mr-1"></i>대시보드
                        </button>
                        <button onclick="showView('memories')" class="nav-btn px-3 py-2 text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition">
                            <i class="fas fa-images mr-1"></i>추억
                        </button>
                        <button onclick="showView('timeline')" class="nav-btn px-3 py-2 text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition">
                            <i class="fas fa-stream mr-1"></i>타임라인
                        </button>
                        <button onclick="exportData()" class="px-3 py-2 text-sm text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
                            <i class="fas fa-download mr-1"></i>내보내기
                        </button>
                        <button onclick="showAddMemory()" class="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                            <i class="fas fa-plus mr-1"></i>추억 추가
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
                    <div class="bg-gradient-to-br from-green-400 to-green-600 text-white p-6 rounded-xl">
                        <i class="fas fa-smile text-3xl mb-2"></i>
                        <p class="text-sm opacity-90">긍정적 추억</p>
                        <p id="positive-memories" class="text-4xl font-bold">0</p>
                    </div>
                    <div class="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-6 rounded-xl">
                        <i class="fas fa-meh text-3xl mb-2"></i>
                        <p class="text-sm opacity-90">중립적 추억</p>
                        <p id="neutral-memories" class="text-4xl font-bold">0</p>
                    </div>
                    <div class="bg-gradient-to-br from-orange-400 to-orange-600 text-white p-6 rounded-xl">
                        <i class="fas fa-chart-line text-3xl mb-2"></i>
                        <p class="text-sm opacity-90">평균 중요도</p>
                        <p id="avg-importance" class="text-4xl font-bold">0</p>
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
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 class="text-3xl font-bold text-gray-900">내 추억</h2>
                    <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <select id="category-filter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            <option value="">모든 카테고리</option>
                        </select>
                        <input id="search-input" type="text" placeholder="검색..." class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                    </div>
                </div>
                
                <div id="memories-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                
                <!-- Pagination -->
                <div id="pagination" class="flex justify-center mt-8 space-x-2"></div>
            </div>

            <!-- Timeline View -->
            <div id="timeline-view" class="view-section hidden">
                <h2 class="text-3xl font-bold text-gray-900 mb-6">타임라인</h2>
                <div id="timeline-content" class="space-y-6"></div>
            </div>

            <!-- Add/Edit Memory Modal -->
            <div id="memory-modal" class="modal fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
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
                            
                            <!-- File Upload Area -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    파일 업로드 (이미지/동영상)
                                </label>
                                <div id="upload-area" class="upload-area p-8 rounded-lg text-center cursor-pointer">
                                    <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                                    <p class="text-sm text-gray-600">클릭하거나 파일을 드래그하세요</p>
                                    <p class="text-xs text-gray-400 mt-1">또는 아래에 URL을 직접 입력하세요</p>
                                    <input type="file" id="file-input" class="hidden" accept="image/*,video/*">
                                </div>
                                <input type="text" id="file-url" placeholder="또는 파일 URL 입력" class="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm">
                                <div id="file-preview" class="mt-2"></div>
                            </div>
                            
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
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" id="auto-analyze" checked class="rounded text-purple-600 focus:ring-purple-500">
                                    <span class="text-sm text-gray-700">
                                        <i class="fas fa-robot text-purple-600"></i>
                                        AI 자동 분석 (요약, 감정, 키워드)
                                    </span>
                                </label>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">중요도 (1-10)</label>
                                <input type="range" id="importance-score" min="1" max="10" value="5" class="w-full">
                                <div class="flex justify-between text-xs text-gray-500">
                                    <span>1</span>
                                    <span id="importance-value" class="font-bold text-purple-600">5</span>
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
                                    <i class="fas fa-save mr-2"></i>저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Memory Detail Modal -->
            <div id="detail-modal" class="modal fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
                <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
            let uploadedFileUrl = null;

            // Initialize app
            async function init() {
                await loadCategories();
                await loadStatistics();
                showView('dashboard');
                
                setupEventListeners();
            }

            function setupEventListeners() {
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
                
                // File upload
                const uploadArea = document.getElementById('upload-area');
                const fileInput = document.getElementById('file-input');
                
                uploadArea.addEventListener('click', () => fileInput.click());
                
                fileInput.addEventListener('change', handleFileSelect);
                
                // Drag and drop
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('dragover');
                });
                
                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('dragover');
                });
                
                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('dragover');
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        fileInput.files = files;
                        handleFileSelect({ target: fileInput });
                    }
                });
            }

            // Handle file selection
            async function handleFileSelect(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const preview = document.getElementById('file-preview');
                preview.innerHTML = \`
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-file text-purple-600"></i>
                            <span class="text-sm text-gray-700">\${file.name}</span>
                        </div>
                        <span class="text-xs text-gray-500">\${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">
                        <i class="fas fa-info-circle"></i>
                        R2 버킷 미설정 시 URL을 직접 입력해주세요
                    </p>
                \`;
                
                // Try to upload (will fail gracefully if R2 not configured)
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    preview.innerHTML += '<p class="text-xs text-blue-600 mt-2"><i class="fas fa-spinner fa-spin"></i> 업로드 중...</p>';
                    
                    const response = await axios.post(\`\${API_BASE}/upload\`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    
                    uploadedFileUrl = response.data.url;
                    document.getElementById('file-url').value = uploadedFileUrl;
                    
                    preview.innerHTML = \`
                        <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                            <div class="flex items-center space-x-2">
                                <i class="fas fa-check-circle text-green-600"></i>
                                <span class="text-sm text-green-700">업로드 완료!</span>
                            </div>
                        </div>
                    \`;
                    
                    // Show preview if image
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            preview.innerHTML += \`<img src="\${e.target.result}" class="mt-2 rounded-lg max-h-48 object-cover">\`;
                        };
                        reader.readAsDataURL(file);
                    }
                } catch (error) {
                    console.log('업로드 실패 (R2 미설정):', error.response?.data?.error);
                    preview.innerHTML = \`
                        <div class="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p class="text-sm text-yellow-800">
                                <i class="fas fa-exclamation-triangle"></i>
                                자동 업로드 불가 (R2 미설정)
                            </p>
                            <p class="text-xs text-yellow-700 mt-1">
                                아래 URL 입력란에 외부 이미지 URL을 입력하세요
                            </p>
                        </div>
                    \`;
                }
            }

            // Load categories
            async function loadCategories() {
                try {
                    const response = await axios.get(\`\${API_BASE}/categories\`);
                    categories = response.data;
                    
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
                    
                    // Sentiment stats
                    const sentiments = stats.sentiments.reduce((acc, s) => {
                        acc[s.ai_sentiment] = s.count;
                        return acc;
                    }, {});
                    document.getElementById('positive-memories').textContent = sentiments.positive || 0;
                    document.getElementById('neutral-memories').textContent = sentiments.neutral || 0;
                    
                    // Categories chart
                    const categoriesChart = document.getElementById('categories-chart');
                    categoriesChart.innerHTML = stats.byCategory.map(cat => \`
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <div class="flex items-center space-x-3">
                                <span class="text-2xl">\${cat.icon}</span>
                                <span class="font-medium text-gray-700">\${cat.name}</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <div class="w-32 bg-gray-200 rounded-full h-2">
                                    <div class="h-2 rounded-full" style="width: \${(cat.count / stats.total * 100) || 0}%; background-color: \${cat.color}"></div>
                                </div>
                                <span class="text-sm font-semibold text-gray-600 w-8 text-right">\${cat.count}</span>
                            </div>
                        </div>
                    \`).join('');
                    
                    // Recent memories
                    const recentMemories = document.getElementById('recent-memories');
                    recentMemories.innerHTML = stats.recent.map(memory => \`
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition" onclick="showMemoryDetail(\${memory.id})">
                            <div class="flex items-center space-x-3">
                                \${memory.file_url && memory.file_type?.startsWith('image') ? 
                                    \`<img src="\${memory.file_url}" class="w-12 h-12 rounded-lg object-cover">\` :
                                    \`<span class="text-xl">\${memory.category_icon || '📦'}</span>\`
                                }
                                <div>
                                    <p class="font-medium text-gray-900">\${memory.title}</p>
                                    <p class="text-xs text-gray-500">\${new Date(memory.created_at).toLocaleDateString('ko-KR')}</p>
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
                        <div class="memory-card bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer" onclick="showMemoryDetail(\${memory.id})">
                            \${memory.file_url ? 
                                (memory.file_type?.startsWith('image') ? 
                                    \`<img src="\${memory.file_url}" alt="\${memory.title}" onerror="this.src='https://via.placeholder.com/400x200?text=이미지+로드+실패'">\` :
                                    \`<div class="w-full h-48 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                                        <i class="fas fa-video text-white text-4xl"></i>
                                    </div>\`
                                ) :
                                \`<div class="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                    <span class="text-6xl">\${memory.category_icon || '📦'}</span>
                                </div>\`
                            }
                            <div class="p-4">
                                <div class="flex items-start justify-between mb-2">
                                    <h3 class="text-lg font-bold text-gray-900 flex-1">\${memory.title}</h3>
                                    <div class="flex items-center space-x-1 ml-2">
                                        \${Array(Math.min(memory.importance_score || 5, 5)).fill('<i class="fas fa-star text-yellow-400 text-xs"></i>').join('')}
                                    </div>
                                </div>
                                <p class="text-sm text-gray-600 mb-3 line-clamp-2">\${memory.description || memory.ai_summary || ''}</p>
                                <div class="flex items-center justify-between text-xs">
                                    <span class="text-gray-500">\${new Date(memory.created_at).toLocaleDateString('ko-KR')}</span>
                                    <div class="flex items-center space-x-2">
                                        \${memory.ai_sentiment ? \`
                                            <span class="px-2 py-1 rounded-full \${
                                                memory.ai_sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                                                memory.ai_sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }">
                                                \${memory.ai_sentiment === 'positive' ? '😊' : memory.ai_sentiment === 'negative' ? '😢' : '😐'}
                                            </span>
                                        \` : ''}
                                        <span class="category-badge px-2 py-1 rounded-full text-xs" style="background-color: \${memory.category_color}20; color: \${memory.category_color}">
                                            \${memory.category_name || '미분류'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    \`).join('');
                    
                    renderPagination(pagination);
                } catch (error) {
                    console.error('Error loading memories:', error);
                }
            }

            // Load timeline
            async function loadTimeline() {
                try {
                    const response = await axios.get(\`\${API_BASE}/memories?limit=100\`);
                    const memories = response.data.data;
                    
                    // Group by year and month
                    const grouped = memories.reduce((acc, memory) => {
                        const date = new Date(memory.original_date || memory.created_at);
                        const year = date.getFullYear();
                        const month = date.getMonth();
                        const key = \`\${year}-\${month}\`;
                        
                        if (!acc[key]) {
                            acc[key] = {
                                year,
                                month,
                                monthName: date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }),
                                memories: []
                            };
                        }
                        acc[key].memories.push(memory);
                        return acc;
                    }, {});
                    
                    const timeline = document.getElementById('timeline-content');
                    timeline.innerHTML = Object.values(grouped)
                        .sort((a, b) => b.year - a.year || b.month - a.month)
                        .map(group => \`
                            <div class="timeline-item">
                                <div class="timeline-dot"></div>
                                <h3 class="text-xl font-bold text-purple-600 mb-4">\${group.monthName}</h3>
                                <div class="space-y-3">
                                    \${group.memories.map(memory => \`
                                        <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer" onclick="showMemoryDetail(\${memory.id})">
                                            <div class="flex items-start space-x-3">
                                                \${memory.file_url && memory.file_type?.startsWith('image') ? 
                                                    \`<img src="\${memory.file_url}" class="w-16 h-16 rounded-lg object-cover">\` :
                                                    \`<span class="text-2xl">\${memory.category_icon || '📦'}</span>\`
                                                }
                                                <div class="flex-1">
                                                    <h4 class="font-semibold text-gray-900">\${memory.title}</h4>
                                                    <p class="text-sm text-gray-600 mt-1">\${memory.description || memory.ai_summary || ''}</p>
                                                    <p class="text-xs text-gray-400 mt-2">\${new Date(memory.created_at).toLocaleString('ko-KR')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    \`).join('')}
                                </div>
                            </div>
                        \`).join('');
                } catch (error) {
                    console.error('Error loading timeline:', error);
                }
            }

            // Render pagination
            function renderPagination(pagination) {
                const paginationEl = document.getElementById('pagination');
                const pages = [];
                
                const maxPages = Math.min(pagination.totalPages, 10);
                for (let i = 1; i <= maxPages; i++) {
                    pages.push(\`
                        <button onclick="goToPage(\${i})" class="px-4 py-2 \${i === pagination.page ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-purple-50'} rounded-lg border transition">
                            \${i}
                        </button>
                    \`);
                }
                
                paginationEl.innerHTML = pages.join('');
            }

            function goToPage(page) {
                currentPage = page;
                loadMemories();
                window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        
                        \${memory.file_url ? \`
                            <div class="mb-6">
                                \${memory.file_type?.startsWith('image') ? 
                                    \`<img src="\${memory.file_url}" alt="\${memory.title}" class="w-full rounded-lg shadow-lg">\` :
                                    \`<video src="\${memory.file_url}" controls class="w-full rounded-lg shadow-lg"></video>\`
                                }
                            </div>
                        \` : ''}
                        
                        <div class="space-y-4">
                            <div>
                                <h4 class="text-sm font-semibold text-gray-700 mb-2">설명</h4>
                                <p class="text-gray-600">\${memory.description || '없음'}</p>
                            </div>
                            
                            <div>
                                <h4 class="text-sm font-semibold text-gray-700 mb-2">내용</h4>
                                <p class="text-gray-600 whitespace-pre-wrap">\${memory.content || '없음'}</p>
                            </div>
                            
                            <div class="flex flex-wrap gap-4 text-sm">
                                <div>
                                    <span class="text-gray-700 font-medium">중요도:</span>
                                    <span class="ml-2">\${Array(memory.importance_score || 5).fill('⭐').join('')}</span>
                                </div>
                                \${memory.ai_sentiment ? \`
                                    <div>
                                        <span class="text-gray-700 font-medium">감정:</span>
                                        <span class="ml-2 px-2 py-1 rounded-full text-xs \${memory.ai_sentiment === 'positive' ? 'bg-green-100 text-green-700' : memory.ai_sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}">
                                            \${memory.ai_sentiment === 'positive' ? '😊 긍정' : memory.ai_sentiment === 'negative' ? '😢 부정' : '😐 중립'}
                                        </span>
                                    </div>
                                \` : ''}
                            </div>
                            
                            \${memory.ai_summary ? \`
                                <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h4 class="text-sm font-semibold text-blue-900 mb-2">
                                        <i class="fas fa-robot mr-2"></i>AI 요약
                                    </h4>
                                    <p class="text-blue-800">\${memory.ai_summary}</p>
                                </div>
                            \` : ''}
                            
                            \${memory.ai_keywords ? \`
                                <div>
                                    <h4 class="text-sm font-semibold text-gray-700 mb-2">
                                        <i class="fas fa-tags mr-2"></i>AI 키워드
                                    </h4>
                                    <div class="flex flex-wrap gap-2">
                                        \${JSON.parse(memory.ai_keywords).map(kw => \`
                                            <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">\${kw}</span>
                                        \`).join('')}
                                    </div>
                                </div>
                            \` : ''}
                            
                            \${memory.connections && memory.connections.length > 0 ? \`
                                <div>
                                    <h4 class="text-sm font-semibold text-gray-700 mb-2">
                                        <i class="fas fa-link mr-2"></i>연결된 추억
                                    </h4>
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
                document.getElementById('file-preview').innerHTML = '';
                uploadedFileUrl = null;
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
                    document.getElementById('file-url').value = memory.file_url || '';
                    document.getElementById('importance-score').value = memory.importance_score || 5;
                    document.getElementById('importance-value').textContent = memory.importance_score || 5;
                    
                    if (memory.original_date) {
                        const date = new Date(memory.original_date);
                        document.getElementById('original-date').value = date.toISOString().slice(0, 16);
                    }
                    
                    if (memory.file_url) {
                        const preview = document.getElementById('file-preview');
                        if (memory.file_type?.startsWith('image')) {
                            preview.innerHTML = \`<img src="\${memory.file_url}" class="mt-2 rounded-lg max-h-48 object-cover">\`;
                        }
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
                const fileUrl = uploadedFileUrl || document.getElementById('file-url').value;
                
                const data = {
                    title: document.getElementById('title').value,
                    category_id: document.getElementById('category').value ? parseInt(document.getElementById('category').value) : null,
                    description: document.getElementById('description').value,
                    content: document.getElementById('content').value,
                    file_url: fileUrl || null,
                    file_type: fileUrl ? (fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'video') : null,
                    importance_score: parseInt(document.getElementById('importance-score').value),
                    original_date: document.getElementById('original-date').value || null,
                    auto_analyze: document.getElementById('auto-analyze').checked
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
                    } else if (currentView === 'timeline') {
                        loadTimeline();
                    } else {
                        loadStatistics();
                    }
                    alert('저장되었습니다!');
                } catch (error) {
                    console.error('Error saving memory:', error);
                    alert('저장에 실패했습니다: ' + (error.response?.data?.error || error.message));
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
                    } else if (currentView === 'timeline') {
                        loadTimeline();
                    } else {
                        loadStatistics();
                    }
                    alert('삭제되었습니다.');
                } catch (error) {
                    console.error('Error deleting memory:', error);
                    alert('삭제에 실패했습니다.');
                }
            }

            // Export data
            async function exportData() {
                try {
                    const response = await axios.get(\`\${API_BASE}/export\`);
                    const data = response.data;
                    
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`memorylink-export-\${new Date().toISOString().split('T')[0]}.json\`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    alert('데이터를 내보냈습니다!');
                } catch (error) {
                    console.error('Error exporting data:', error);
                    alert('내보내기에 실패했습니다.');
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
                document.getElementById('timeline-view').classList.toggle('hidden', view !== 'timeline');
                
                if (view === 'memories') {
                    loadMemories();
                } else if (view === 'dashboard') {
                    loadStatistics();
                } else if (view === 'timeline') {
                    loadTimeline();
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
