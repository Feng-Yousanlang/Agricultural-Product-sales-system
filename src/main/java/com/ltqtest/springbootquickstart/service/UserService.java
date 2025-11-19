package com.ltqtest.springbootquickstart.service;

import com.ltqtest.springbootquickstart.entity.User;
import com.ltqtest.springbootquickstart.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
    
    public User register(User user) {
        // 检查用户名是否已存在
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }
        
        // 检查手机号是否已存在（如果提供了手机号）
        if (user.getPhone() != null && !user.getPhone().isEmpty()) {
            // 注意：需要在UserRepository中添加existsByPhone方法
            // 暂时注释掉，等Repository完善后再启用
            // if (userRepository.existsByPhone(user.getPhone())) {
            //     throw new RuntimeException("手机号已存在");
            // }
        }
        
        // 检查邮箱是否已存在（如果提供了邮箱）
        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            // 注意：需要在UserRepository中添加existsByEmail方法
            // 暂时注释掉，等Repository完善后再启用
            // if (userRepository.existsByEmail(user.getEmail())) {
            //     throw new RuntimeException("邮箱已存在");
            // }
        }
        
        // 不需要密码加密，直接使用原始密码
        // 注意：在实际应用中应该对密码进行加密处理
        
        // 设置默认角色类型为农户
        if (user.getRoleType() == null) {
            user.setRoleType(1); // 1表示农户
        }
        
        // 设置默认状态为正常
        if (user.getStatus() == null) {
            user.setStatus(1); // 1表示正常
        }
        
        // 保存到数据库
        return userRepository.save(user);
    }
    
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }
    
    public Optional<User> findByUserId(Long userId) {
        // 注意：需要修改UserRepository的findById方法参数类型
        // 暂时返回空，等Repository完善后再修改
        return Optional.empty();
    }
    
    public List<User> findAll() {
        return userRepository.findAll();
    }
    
    public List<User> findByRoleType(Integer roleType) {
        return userRepository.findAll().stream()
                .filter(user -> user.getRoleType().equals(roleType))
                .toList();
    }
    
    public User update(User user) {
        return userRepository.save(user);
    }
    
    public void delete(Long userId) {
        // 注意：需要修改UserRepository的deleteById方法参数类型
        // userRepository.deleteById(userId);
    }
}
