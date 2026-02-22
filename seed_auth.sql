-- Update test user with password (bcrypt hash of "password123")
UPDATE users SET password = '$2a$10$YourHashHere' WHERE id = 1;

-- Update existing memories with sample image URLs
UPDATE memories SET 
  file_url = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800',
  file_type = 'image/jpeg'
WHERE id = 1;

UPDATE memories SET 
  file_url = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  file_type = 'image/jpeg'
WHERE id = 2;

UPDATE memories SET 
  file_url = 'https://images.unsplash.com/photo-1476362555312-ab9e108a0b7e?w=800',
  file_type = 'image/jpeg'
WHERE id = 3;

UPDATE memories SET 
  file_url = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
  file_type = 'image/jpeg'
WHERE id = 4;

UPDATE memories SET 
  file_url = 'https://images.unsplash.com/photo-1415604934674-561df9abf539?w=800',
  file_type = 'image/jpeg'
WHERE id = 5;

-- Add more sample memories with images
INSERT OR IGNORE INTO memories (id, user_id, category_id, title, description, content, file_url, file_type, tags, ai_summary, ai_sentiment, importance_score, original_date) VALUES 
  (6, 1, 1, '친구들과의 모임', '대학교 동기들과 함께한 저녁 식사', '오랜만에 만난 친구들과 즐거운 시간을 보냈다', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800', 'image/jpeg', '["친구", "모임", "대학"]', '친구들과의 즐거운 재회', 'positive', 8, '2023-09-10 18:30:00'),
  (7, 1, 1, '생일 파티', '30번째 생일을 축하하며', '가족과 친구들이 준비한 서프라이즈 파티', 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800', 'image/jpeg', '["생일", "파티", "축하"]', '특별한 생일 축하 파티', 'positive', 10, '2024-05-15 19:00:00'),
  (8, 1, 1, '일몰 풍경', '바닷가에서 본 아름다운 일몰', '하루를 마무리하며 본 평화로운 풍경', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 'image/jpeg', '["자연", "일몰", "바다"]', '평화로운 일몰의 순간', 'positive', 7, '2024-08-20 19:30:00'),
  (9, 1, 1, '커피 한잔의 여유', '좋아하는 카페에서', '책을 읽으며 보낸 조용한 오후', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', 'image/jpeg', '["카페", "여유", "독서"]', '조용한 카페에서의 힐링 타임', 'positive', 6, '2024-10-05 14:00:00'),
  (10, 1, 1, '산책길', '가을 단풍이 아름다운 공원', '노란 은행나무 길을 걸으며', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', 'image/jpeg', '["가을", "산책", "공원"]', '가을 단풍길 산책', 'positive', 7, '2024-11-01 15:00:00');
