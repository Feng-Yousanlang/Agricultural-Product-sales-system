package com.ltqtest.springbootquickstart.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.ltqtest.springbootquickstart.entity.FinancialProduct;

public interface FinancialProductRepository extends JpaRepository<FinancialProduct, Integer> {
    // 根据产品名称查询产品
    FinancialProduct findByFpName(String fpName);
}