-- Insert default categories
INSERT OR IGNORE INTO categories (id, name, icon, color) VALUES 
  (1, '사진', '📷', '#3B82F6'),
  (2, '동영상', '🎥', '#8B5CF6'),
  (3, '문서', '📄', '#10B981'),
  (4, 'SNS 게시물', '💬', '#F59E0B'),
  (5, '이메일', '📧', '#EF4444'),
  (6, '음성/통화', '🎙️', '#EC4899'),
  (7, '기타', '📦', '#6B7280');

-- Insert test user
INSERT OR IGNORE INTO users (id, email, name, avatar_url) VALUES 
  (1, 'test@memorylink.com', '테스트 사용자', 'https://i.pravatar.cc/150?img=1');

-- Insert sample memories
INSERT OR IGNORE INTO memories (user_id, category_id, title, description, content, tags, ai_summary, ai_sentiment, importance_score, original_date) VALUES 
  (1, 1, '가족 여행 사진', '2023년 여름 제주도 가족 여행', '가족들과 함께한 즐거운 시간', '["가족", "여행", "제주도"]', '가족들과 함께한 제주도 여행의 행복한 순간', 'positive', 9, '2023-07-15 14:30:00'),
  (1, 2, '졸업식 영상', '대학교 졸업식 영상 기록', '4년간의 대학 생활을 마무리하는 순간', '["졸업", "대학교", "추억"]', '대학교 졸업식의 감동적인 순간', 'positive', 10, '2022-02-20 10:00:00'),
  (1, 3, '할머니의 편지', '할머니께서 보내주신 손편지', '따뜻한 마음이 담긴 소중한 편지', '["가족", "편지", "할머니"]', '할머니의 사랑이 담긴 따뜻한 편지', 'positive', 10, '2020-12-25 00:00:00'),
  (1, 4, '첫 취업 기념 SNS 게시물', 'LinkedIn에 올렸던 첫 취업 소식', '첫 직장에 입사하던 날의 설렘', '["취업", "직장", "시작"]', '새로운 시작을 알리는 기쁜 소식', 'positive', 8, '2023-03-01 09:00:00'),
  (1, 1, '반려동물 첫 만남', '반려견 복실이를 처음 만난 날', '작고 귀여운 강아지와의 첫 만남', '["반려동물", "강아지", "첫만남"]', '새로운 가족 구성원과의 특별한 만남', 'positive', 9, '2021-05-10 16:00:00');

-- Insert sample connections
INSERT OR IGNORE INTO connections (memory_id_1, memory_id_2, connection_type, strength) VALUES 
  (1, 5, 'related', 8),
  (2, 4, 'sequence', 7);
