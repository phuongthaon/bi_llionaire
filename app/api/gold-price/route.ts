import { NextResponse } from 'next/server';

const GOLD_API = 'http://api.btmc.vn/api/BTMCAPI/getpricebtmc?key=3kd8ub1llcg9t45hnoh8hmn7t5kc2v';
const TELEGRAM_TOKEN = '7679781471:AAGWWgZgFZ-lkXZBHFiOjx7wyYsgrBV2UYA';
const TELEGRAM_CHAT_ID = '5327342037';
const UPDATE_INTERVAL = 8 * 60 * 60 * 1000; // 8 tiếng

interface GoldPrice {
    name: string;
    buy: number;
    sell: number;
    date: string;
    purity: string;
}

// Biến để kiểm soát việc gửi tin nhắn định kỳ
let isScheduled = false;
let intervalId: NodeJS.Timeout | null = null;
let nextUpdateTime: Date | null = null;
let lastPrices: GoldPrice[] = [];

// Hàm lấy dữ liệu giá vàng
async function fetchGoldPrices(): Promise<GoldPrice[]> {
    try {
        const response = await fetch(GOLD_API);
        const data = await response.json();
        const goldPrices = data.DataList.Data;

        return goldPrices
            .filter((price: any) => {
                const row = price['@row'];
                const name = price[`@n_${row}`];
                const buy = price[`@pb_${row}`];
                const sell = price[`@ps_${row}`];
                const purity = price[`@h_${row}`];

                return name && buy && sell && sell !== '0' && purity;
            })
            .map((price: any) => {
                const row = price['@row'];
                return {
                    name: price[`@n_${row}`],
                    buy: parseInt(price[`@pb_${row}`]),
                    sell: parseInt(price[`@ps_${row}`]),
                    date: price[`@d_${row}`],
                    purity: price[`@h_${row}`]
                };
            })
            .filter((price: GoldPrice) => !isNaN(price.buy) && !isNaN(price.sell));
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu giá vàng:', error);
        return [];
    }
}

// Hàm kiểm tra xem giá có thay đổi không
function hasPriceChanged(newPrices: GoldPrice[]): boolean {
    if (lastPrices.length === 0) return true;

    return newPrices.some((newPrice, index) => {
        const oldPrice = lastPrices[index];
        return !oldPrice ||
            newPrice.buy !== oldPrice.buy ||
            newPrice.sell !== oldPrice.sell;
    });
}

// Hàm gửi tin nhắn giá vàng
async function sendGoldPriceMessage() {
    try {
        const newPrices = await fetchGoldPrices();

        // Chỉ gửi tin nhắn nếu giá thay đổi
        if (hasPriceChanged(newPrices)) {
            lastPrices = newPrices;

            // Nhóm theo thương hiệu
            const groupedPrices = newPrices.reduce((acc: { [key: string]: GoldPrice[] }, price) => {
                const brand = price.name.split('(').pop()?.replace(')', '').trim() || 'Khác';
                if (!acc[brand]) {
                    acc[brand] = [];
                }
                acc[brand].push(price);
                return acc;
            }, {});

            // Cập nhật thời gian cập nhật tiếp theo
            nextUpdateTime = new Date(Date.now() + UPDATE_INTERVAL);

            // Tạo tin nhắn
            let message = `📊 *Cập nhật giá vàng ${new Date().toLocaleString('vi-VN')}*\n\n`;

            // Thêm giá vàng theo từng thương hiệu
            Object.entries(groupedPrices).forEach(([brand, prices]) => {
                message += `*${brand}*\n`;
                prices.forEach(price => {
                    const name = price.name.split('(')[0].trim();
                    const difference = price.sell - price.buy;
                    const differenceEmoji = difference > 0 ? '📈' : '📉';

                    message += `• ${name} (${price.purity}‰)\n`;
                    message += `  💰 Mua vào: ${price.buy.toLocaleString('vi-VN')}đ\n`;
                    message += `  💵 Bán ra: ${price.sell.toLocaleString('vi-VN')}đ\n`;
                    message += `  ${differenceEmoji} Chênh lệch: ${Math.abs(difference).toLocaleString('vi-VN')}đ\n`;
                });
                message += '\n';
            });

            message += `\n⏰ Lần cập nhật tiếp theo: ${nextUpdateTime.toLocaleString('vi-VN')}\n`;
            message += `📱 _Nguồn: BTMC_`;

            // Gửi tin nhắn qua Telegram
            const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(message)}&parse_mode=Markdown`;
            await fetch(telegramUrl);

            console.log('Đã gửi tin nhắn giá vàng:', new Date().toLocaleString('vi-VN'));
        } else {
            console.log('Giá vàng không thay đổi:', new Date().toLocaleString('vi-VN'));
            // Cập nhật thời gian cập nhật tiếp theo
            nextUpdateTime = new Date(Date.now() + UPDATE_INTERVAL);
        }
    } catch (error) {
        console.error('Lỗi khi gửi tin nhắn:', error);
    }
}

export async function GET() {
    try {
        if (!isScheduled) {
            // Gửi tin nhắn ngay lập tức
            await sendGoldPriceMessage();

            // Thiết lập lịch cập nhật giá vàng mỗi 8 tiếng
            intervalId = setInterval(sendGoldPriceMessage, UPDATE_INTERVAL);
            isScheduled = true;

            return NextResponse.json({
                success: true,
                message: 'Đã thiết lập lịch cập nhật giá vàng mỗi 8 tiếng'
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Lịch cập nhật giá vàng đã được thiết lập trước đó',
            nextUpdate: nextUpdateTime?.toLocaleString('vi-VN')
        });
    } catch (error) {
        console.error('Lỗi khi thiết lập lịch cập nhật:', error);
        return NextResponse.json({
            success: false,
            error: 'Có lỗi xảy ra khi thiết lập lịch cập nhật'
        }, { status: 500 });
    }
}

// Hàm để dừng cập nhật giá vàng
export async function POST() {
    try {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            isScheduled = false;
            nextUpdateTime = null;
            lastPrices = [];
            return NextResponse.json({
                success: true,
                message: 'Đã dừng cập nhật giá vàng'
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Không có lịch cập nhật nào đang chạy'
        });
    } catch (error) {
        console.error('Lỗi khi dừng cập nhật:', error);
        return NextResponse.json({
            success: false,
            error: 'Có lỗi xảy ra khi dừng cập nhật'
        }, { status: 500 });
    }
} 