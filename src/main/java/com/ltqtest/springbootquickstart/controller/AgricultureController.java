
package com.ltqtest.springbootquickstart.controller;

import com.ltqtest.springbootquickstart.common.Result;
import com.ltqtest.springbootquickstart.entity.AgricultureProduct;
import com.ltqtest.springbootquickstart.repository.AgricultureRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api")
public class AgricultureController {

    @Autowired
    private AgricultureRepository agricultureRepository;

    /**
     * 助农电商接口 - 展示电商产品
     * 接口路径: GET /api/agricultural/source
     * @param nums 请求的产品数量
     * @return 产品列表及相关信息
     */
    @GetMapping("/agricultural/source")
    public Result<Map<String, Object>> getAgriculturalProducts(@RequestParam(required = false, defaultValue = "10") Integer nums) {
        try {
            // 验证参数
            if (nums == null || nums <= 0) {
                return Result.error(400, "参数错误：nums必须为正整数");
            }
            
            // 查询所有产品
            List<AgricultureProduct> products = agricultureRepository.findAll();
            
            // 如果数据不足，返回所有可用数据
            int actualSize = Math.min(nums, products.size());
            List<AgricultureProduct> limitedProducts = new ArrayList<>();
            if (actualSize > 0) {
                limitedProducts = products.subList(0, actualSize);
            }
            
            // 构建响应数据
            List<Map<String, Object>> productList = new ArrayList<>();
            for (AgricultureProduct product : limitedProducts) {
                Map<String, Object> productMap = new HashMap<>();
                productMap.put("productId", product.getProductId());
                productMap.put("productName", product.getProductName());
                productMap.put("price", product.getPrice());
                productMap.put("producer", product.getProducerName());
                productMap.put("salesVolume", product.getSalesVolume() != null ? product.getSalesVolume() : 0);
                productMap.put("ecommerceLink", product.getEcommerceLink() != null ? product.getEcommerceLink() : "");
                productMap.put("productImg", product.getProductImg() != null ? product.getProductImg() : "");
                productList.add(productMap);
            }
            
            // 构建响应数据
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("products", productList);
            
            return Result.success(200, "获取商品列表成功", responseData);
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
}
