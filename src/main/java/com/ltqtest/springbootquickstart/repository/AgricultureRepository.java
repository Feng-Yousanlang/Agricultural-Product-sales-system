package com.ltqtest.springbootquickstart.repository;
import com.ltqtest.springbootquickstart.entity.AgricultureProduct;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgricultureRepository extends JpaRepository<AgricultureProduct, Integer> {
    
    // 查询所有商品
    List<AgricultureProduct> findAll();
}
