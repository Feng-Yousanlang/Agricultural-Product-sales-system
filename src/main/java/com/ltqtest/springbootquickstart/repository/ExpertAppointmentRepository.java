package com.ltqtest.springbootquickstart.repository;

import com.ltqtest.springbootquickstart.entity.ExpertAppointment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExpertAppointmentRepository extends JpaRepository<ExpertAppointment, Long> {
    // 根据userId查询用户的所有预约记录
    List<ExpertAppointment> findByUserId(Integer userId);
    
    // 根据expertId和status查询预约记录，支持分页
    Page<ExpertAppointment> findByExpertIdAndStatus(Integer expertId, String status, Pageable pageable);
    
    // 根据expertId、date和status列表查询预约记录
    List<ExpertAppointment> findByExpertIdAndDateAndStatusIn(Integer expertId, LocalDate date, List<String> statusList);
    
    // 根据expertId和status列表查询预约记录
    List<ExpertAppointment> findByExpertIdAndStatusIn(Integer expertId, List<String> statusList);
    
    // 根据expertId、userId、date和time查询预约记录
    Optional<ExpertAppointment> findByExpertIdAndUserIdAndDateAndTime(Integer expertId, Integer userId, LocalDate date, String time);
}
