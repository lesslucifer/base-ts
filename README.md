# User Implicit - User Interest Service

## Kiến trúc tổng quan
 ![enter image description here](https://i.imgur.com/WwxUdTg.png)

## User Interest Service 
Server nhận consume realtime User Event từ Tracking Service.
Phân tích và buffer số liệu realtime vào Redis.
Định kì chuyển đổi dữ liệu từ Redis sang MongoDB và tính toán điểm số User Interest

- Input: UserEvent từ Kafka của Tracking Service
- Output: Điểm số interest của user theo từng chủ đề được cấu hình sẵn

- Phụ thuộc: 
	- MongoDB: Medium write-loads. Up to 500 write-ops / sec (schedully)
	- Redis: Cache & persist data. Thousands ops / sec
	- MainAPI MySQL: Read-only. Few queries / sec
	- Kafka: Consume UserEvent from Tracking Service
	- RabbitMQ: Fire user interest update events. Push up to 10k msgs / 10 mins
- Platform: NodeJS

> Written with [StackEdit](https://stackedit.io/).