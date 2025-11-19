package com.ltqtest.springbootquickstart.repository;

import com.ltqtest.springbootquickstart.entity.RepaymentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RepaymentRecordRepository extends JpaRepository<RepaymentRecord, Integer> {
    // 根据用户ID查询还款记录
    List<RepaymentRecord> findByUserId(Integer userId);
}
