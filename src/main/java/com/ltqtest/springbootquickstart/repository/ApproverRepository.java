package com.ltqtest.springbootquickstart.repository;

import com.ltqtest.springbootquickstart.entity.Approver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApproverRepository extends JpaRepository<Approver, Integer> {
    // 可以根据需要添加其他查询方法
}

