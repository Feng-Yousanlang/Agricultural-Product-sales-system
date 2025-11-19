package com.ltqtest.springbootquickstart.repository;

import com.ltqtest.springbootquickstart.entity.AgricultureKnowledge;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AgricultureKnowledgeRepository extends JpaRepository<AgricultureKnowledge, Integer> {
    // 按标题模糊查询农业知识文章
    Page<AgricultureKnowledge> findByTitleContaining(String keyword, Pageable pageable);
    
    // 获取包含关键词的文章总数
    long countByTitleContaining(String keyword);
}
