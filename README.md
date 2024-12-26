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

Yêu cầu khác:

- tiết kiệm chi phí
- có tính mở rộng: sau này có thể sẽ thu phí của prj
- KOL khi claim tiền sẽ phải trả phí giao dịch, khi prj nạp tiền vào contract thì prj phải trả phí giao dịch.

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

Khi Sponser muốn tăng tài trợ cho 1 Offer của họ

```solidity
function upgradeOffer(bytes32 _id, uint256 _extraPayout) public {
        Offer storage offer = offers[_id];
        require(offer.status == OfferStatus.OPEN, "AP03: offer is not open");
        _tranferIn(offer.token, _extraPayout);
        offer.balance += _extraPayout;
        emit OfferUpgraded(_id, _extraPayout);
    }
```

### ClaimReward

Các Particapant sẽ đăng ký trên trang web của Centic, nhiệm vụ sẽ được tracking trên backend của Centic và khi hoàn thành nhiệm vụ, họ sẽ nhận được code, code này dùng để rút reward và code chỉ có thể sử dụng 1 lần

Để tương tác với BE và Contract diễn ra được suôn sẻ, xây dựng 1 key để xác minh on-chain

```solidity
address public verifier;
```

Gợi ý: code = hash (offerID, particapantID)

Khi Particapant request claim giải thưởng, họ sẽ nhập địa chỉ ví
BE sẽ sử dụng, BE sẽ kí lên các dữ liệu là offerID, address người nhận, số lượng reward, và code, chữ kí sẽ được gửi kèm lên contract để xác nhận

```solidity
function claimReward(
        bytes calldata data,
        bytes calldata signature
    ) public nonReentrant {
        (bytes32 id, address addr, uint256 amount, bytes32 uniqueData) = abi
            .decode(data, (bytes32, address, uint256, bytes32));
        require(
            verifyEthMessage(verifier, data, signature),
            "AP08: invalid signature"
        );
        require(msg.sender == addr, "AP06: not owner reward");

        require(!signatureUsed[uniqueData], "AP09: signature already used");
        signatureUsed[uniqueData] = true;

        Offer storage offer = offers[id];
        require(offer.status == OfferStatus.OPEN, "AP03: offer is not open");

        offer.balance -= amount;
        _tranferOut(offer.token, addr, amount);

        emit RewardClaimed(id, addr, amount, uniqueData);
    }
```

### CloseOffer

Sponser sẽ đóng offer và nhận lại số tiền tài trợ dư thừa

```Solidity
function closeOffer(bytes32 _id) public nonReentrant {
        Offer storage offer = offers[_id];
        require(offer.status == OfferStatus.OPEN, "AP07: offer is not open");
        require(offer.addr == msg.sender, "AP10: not owner");
        offer.status = OfferStatus.CLOSED;
        _tranferOut(offer.token, msg.sender, offer.balance);
        offer.balance = 0;
        emit OfferClosed(_id, offer.balance);
    }
```

### Các hàm khác

## Cài đặt mã nguồn

```shell
npm install
npx hardhat test
```

## Deployment

Trong thư mục **deployments**

## Các vấn đề chưa giải quyết
