package com.ltqtest.springbootquickstart.repository;
import com.ltqtest.springbootquickstart.entity.Product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    
    // 查询所有商品
    List<Product> findAll();
    
    // 根据商品ID查询商品
    Product findByProductId(Integer productId);
}