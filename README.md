# Auto Payout Reward

## Giới thiệu

Viết contract thực hiện chức năng tự động thanh toán phục vụ cho Centic.

Các tác nhân:

- Sponsor: nhà tài trợ cho các offer, người trả tiền cho các chiến dịch
- Particapant: người sẽ tham gia những chiến dịch của Sponsor cung cấp, làm nhiệm vụ và nhận thưởng từ Sponsor

Toàn bộ nghiệp vụ logic tính toán sẽ nằm ở backend, contract chỉ có chức năng

- Quản lí tiền tài trợ từ Sponsor
- Trả thưởng cho user theo thông tin từ BE trả đến
- Trả lại tiền tài trợ dư thừa cho Sponsor

## Giải pháp

Viết hợp đồng **AutoPayout** cầm tiền của người dùng và trả thưởng theo thông tin được verify từ backend

## Thiết kế

Xây dựng 1 cấu trúc dữ liệu để lưu các thông tin về các offer
| Name | Type | Mô tả |
| --- | --- | --- |
| id | bytes32 | ID offer mà Sponser tài trợ |
| addr | address | Địa chỉ ví của Sponsor |
| token | address | Loại tài sản Sponser tài trợ |
| balance | uint256 | Tổng số tiền Sponser tài trợ |
| status | uint256 | Trạng thái của offer (NOT_EXIST, OPEN, CLOSED) |

Xây dựng một mapping( bytes32 -> Offer) để tracking các thông tin từ ID.

### Tạo offer

Khi Sponser tạo offer, BE sẽ generate cho Sponser 1 ID, sau đó Sponser sẽ sử dụng các thông tin ID, token, balance, để tạo Offer

```solidity
function openOffer(
        bytes32 _id,
        address _token,
        uint256 _amount
    ) public payable {
        Offer storage offer = offers[_id];
        require(
            offer.status == OfferStatus.NOT_EXIST,
            "AP01: offer already exists"
        );
        _tranferIn(_token, _amount);
        offer.id = _id;
        offer.addr = msg.sender;
        offer.token = _token;
        offer.balance = _amount;
        offer.status = OfferStatus.OPEN;
        emit OfferOpened(_id, msg.sender, _token, _amount);
    }
```

### Nâng cấp offer

### ClaimReward

### CloseOffer

## Cài đặt mã nguồn

## Các vấn đề chưa giải quyết
