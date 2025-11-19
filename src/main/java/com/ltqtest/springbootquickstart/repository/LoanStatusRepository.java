package com.ltqtest.springbootquickstart.repository;

import com.ltqtest.springbootquickstart.entity.LoanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LoanStatusRepository extends JpaRepository<LoanStatus, Integer> {
    // 可以添加额外的查询方法，如根据状态码查询
    boolean existsByStatusCode(Integer statusCode);

}
