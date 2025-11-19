package com.ltqtest.springbootquickstart.repository;

import com.ltqtest.springbootquickstart.entity.News;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 新闻仓库接口
 */
@Repository
public interface NewsRepository extends JpaRepository<News, Integer> {
}