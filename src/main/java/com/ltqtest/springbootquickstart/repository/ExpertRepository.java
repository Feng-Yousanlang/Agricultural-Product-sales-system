package com.ltqtest.springbootquickstart.repository;

import com.ltqtest.springbootquickstart.entity.Expert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExpertRepository extends JpaRepository<Expert, Integer> {
    // 根据关键词搜索专家（匹配姓名、专业领域、简介）
    List<Expert> findByExpertNameContainingOrFieldContainingOrExpertDescriptionContaining(String nameKeyword, String fieldKeyword, String descriptionKeyword);
    
    // 根据专家名称精确查询专家
    Optional<Expert> findByExpertName(String expertName);
}
