
package com.ltqtest.springbootquickstart.controller;

import com.ltqtest.springbootquickstart.common.Result;
import com.ltqtest.springbootquickstart.entity.AgricultureProduct;
import com.ltqtest.springbootquickstart.entity.Product;
import com.ltqtest.springbootquickstart.repository.AgricultureRepository;
import com.ltqtest.springbootquickstart.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class AgricultureController {

    @Autowired
    private AgricultureRepository agricultureRepository;
    
    @Autowired
    private ProductRepository productRepository;

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
    
    /**
     * 获取商品列表接口
     * 接口路径: GET /api/products
     * @param nums 请求的商品数量
     * @return 商品列表及相关信息
     */
    @GetMapping("/products")
    public Result<Map<String, Object>> getProducts(@RequestParam(required = false, defaultValue = "10") Integer nums) {
        try {
            // 验证参数
            if (nums == null || nums <= 0) {
                return Result.error(400, "参数错误：nums必须为正整数");
            }
            
            // 查询所有商品
            List<Product> products = productRepository.findAll();
            
            // 如果数据不足，返回所有可用数据
            int actualSize = Math.min(nums, products.size());
            List<Product> limitedProducts = new ArrayList<>();
            if (actualSize > 0) {
                limitedProducts = products.subList(0, actualSize);
            }
            
            // 构建响应数据
            List<Map<String, Object>> productList = new ArrayList<>();
            for (Product product : limitedProducts) {
                Map<String, Object> productMap = new HashMap<>();
                productMap.put("productId", product.getProductId());
                productMap.put("productName", product.getProductName());
                productMap.put("price", product.getPrice());
                productMap.put("producer", product.getProducer());
                productMap.put("salesVolume", product.getSalesVolume());
                productMap.put("productImg", product.getProductImg());
                productMap.put("surplus", product.getSurplus());
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
    
    /**
     * 获取商品详情接口
     * 接口路径: GET /api/products/{productId}
     * @param productId 商品ID
     * @return 商品详细信息
     */
    @GetMapping("/products/{productId}")
    public Result<Map<String, Object>> getProductDetail(@PathVariable Integer productId) {
        try {
            // 验证参数
            if (productId == null || productId <= 0) {
                return Result.error(400, "参数错误：商品ID无效");
            }
            
            // 根据商品ID查询商品
            Product product = productRepository.findByProductId(productId);
            
            if (product == null) {
                return Result.error(404, "商品不存在");
            }
            
            // 构建响应数据
            Map<String, Object> productMap = new HashMap<>();
            productMap.put("productId", product.getProductId());
            productMap.put("productName", product.getProductName());
            productMap.put("price", product.getPrice());
            productMap.put("producer", product.getProducer());
            productMap.put("salesVolume", product.getSalesVolume());
            productMap.put("productImg", product.getProductImg());
            productMap.put("surplus", product.getSurplus());
            
            return Result.success(200, "获取商品详情成功", productMap);
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
    
    /**
     * 添加商品接口
     * 接口路径: POST /api/products
     * @param request 商品信息
     * @return 添加结果
     */
    @PostMapping("/products")
    public Result<Map<String, Object>> addProduct(@RequestBody Map<String, Object> request) {
        try {
            // 参数校验
            if (request == null) {
                return Result.error(400, "请求参数不能为空");
            }
            
            // 验证必填参数
            if (!request.containsKey("productName") || request.get("productName") == null) {
                return Result.error(400, "参数错误：商品名称不能为空");
            }
            if (!request.containsKey("price") || request.get("price") == null) {
                return Result.error(400, "参数错误：商品价格不能为空");
            }
            if (!request.containsKey("producer") || request.get("producer") == null) {
                return Result.error(400, "参数错误：发售商不能为空");
            }
            if (!request.containsKey("productImg") || request.get("productImg") == null) {
                return Result.error(400, "参数错误：商品封面URL不能为空");
            }
            if (!request.containsKey("surplus") || request.get("surplus") == null) {
                return Result.error(400, "参数错误：商品数量不能为空");
            }
            
            // 解析参数
            String productName;
            Float price;
            String producer;
            String productImg;
            Integer surplus; // 这里surplus代表商品数量
            
            try {
                productName = request.get("productName").toString();
                price = Float.parseFloat(request.get("price").toString());
                producer = request.get("producer").toString();
                productImg = request.get("productImg").toString();
                surplus = Integer.parseInt(request.get("surplus").toString());
            } catch (NumberFormatException e) {
                return Result.error(400, "参数错误：数值类型格式不正确");
            }
            
            // 创建商品对象
            Product product = new Product();
            product.setProductName(productName);
            product.setPrice(price);
            product.setProducer(producer);
            // salesVolume默认为0，不需要手动设置
            product.setProductImg(productImg);
            product.setSurplus(surplus); // 剩余量设置为商品数量
            
            // 保存到数据库
            Product savedProduct = productRepository.save(product);
            
            // 构建响应数据
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("productId", savedProduct.getProductId());
            responseData.put("status", "success");
            
            return Result.success(200, "商品添加成功", responseData);
            
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
}
