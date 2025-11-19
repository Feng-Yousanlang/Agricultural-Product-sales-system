package com.ltqtest.springbootquickstart.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.channel.ChannelProcessingFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // 首先定义一个完整的CORS过滤器
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        
        // 使用allowedOriginPatterns而不是allowedOrigins（Spring Security 5.3+推荐）
        config.addAllowedOriginPattern("*");
        
        // 允许所有HTTP方法
        config.addAllowedMethod("*");
        
        // 允许所有请求头
        config.addAllowedHeader("*");
        
        // 允许发送凭证
        config.setAllowCredentials(true);
        
        // 设置预检请求缓存时间
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        
        return new CorsFilter(source);
    }

    // 配置Spring Security过滤器链，确保CORS过滤器在最前面执行
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // 在Spring Security过滤器链的最开始添加CORS过滤器
        http.addFilterBefore(corsFilter(), ChannelProcessingFilter.class)
            // 禁用CSRF保护（对于API服务通常需要这样做）
            .csrf(csrf -> csrf.disable())
            // 允许所有请求通过，不进行权限验证
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            // 禁用默认的登录页面
            .formLogin(form -> form.disable())
            // 禁用HTTP基本认证
            .httpBasic(httpBasic -> httpBasic.disable());
        
        return http.build();
    }
}