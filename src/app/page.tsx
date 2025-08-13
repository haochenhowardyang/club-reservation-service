import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserReservations } from "@/lib/utils/reservations";
import { formatDisplayDate, formatDisplayTime, formatChineseDate, formatChineseDateTimeForSMS, getCurrentEDT } from "@/lib/utils/time";
import CancelReservationButton from "@/components/CancelReservationButton";
import LandingPage from "@/components/LandingPage";

// Helper function to translate reservation type to Chinese
function getChineseReservationType(type: string): string {
  switch (type) {
    case 'bar': return '酒吧';
    case 'mahjong': return '麻将';
    case 'poker': return '德州扑克';
    default: return type;
  }
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If not logged in, show Chinese landing page with video background
  if (!session) {
    return <LandingPage />;
  }

  // Get user's reservations
  const reservations = await getUserReservations(session.user.id);

  // Get today's date in EDT timezone
  const today = getCurrentEDT().toISODate()!;

  // Filter reservations to exclude past days (but include today)
  const upcomingReservations = reservations.filter(
    (res: any) => res.date >= today
  );

  // Group upcoming reservations by status
  const confirmedReservations = upcomingReservations.filter(
    (res: any) => res.status === "confirmed"
  );
  const waitlistedReservations = upcomingReservations.filter(
    (res: any) => res.status === "waitlisted"
  );

  // If logged in, show reservation options
  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          欢迎，{session.user.name}
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
          来都来了，微醺还是拼命
        </p>
      </div>

      <div className="mt-10 grid gap-5 max-w-lg mx-auto lg:grid-cols-3 lg:max-w-none">
        {/* Poker Card */}
        <div className="flex flex-col rounded-lg shadow-lg overflow-hidden">
          <div className="flex-1 bg-white p-6 flex flex-col justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">德州扑克</h3>
              <p className="mt-3 text-base text-gray-500">
                加入德州扑克waitlist，由管理员邀请参与
              </p>
              <p className="mt-2 text-sm text-gray-500">
                <span className="font-medium text-red-600">注意：</span>受邀请后注意短信确认参加
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/poker"
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                预约德州扑克
              </Link>
            </div>
          </div>
        </div>

        {/* Bar Card */}
        <div className="flex flex-col rounded-lg shadow-lg overflow-hidden">
          <div className="flex-1 bg-white p-6 flex flex-col justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">酒吧</h3>
              <p className="mt-3 text-base text-gray-500">
                周一至周五下午6:00至凌晨2:00，周末中午12:00至凌晨2:00
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/bar"
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                预约酒吧
              </Link>
            </div>
          </div>
        </div>

        {/* Mahjong Card */}
        <div className="flex flex-col rounded-lg shadow-lg overflow-hidden">
          <div className="flex-1 bg-white p-6 flex flex-col justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">麻将</h3>
              <p className="mt-3 text-base text-gray-500">
                周一至周五下午6:00至凌晨2:00，周末中午12:00至凌晨2:00
              </p>
              <p className="mt-2 text-sm text-gray-500">
                <span className="font-medium text-red-600">注意：</span>周五至周日晚上8:00至11:00仅当天开放麻将预约
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/mahjong"
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
              >
                预约麻将
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Reservations */}
      <div className="mt-16 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">
            已确认的预约
          </h2>
        </div>
        <div className="border-t border-gray-200">
          {confirmedReservations.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {confirmedReservations.map((reservation: any) => (
                <li key={reservation.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-600 capitalize">
                        {getChineseReservationType(reservation.type)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatChineseDate(reservation.date)}{" "}
                        {reservation.type === 'poker' 
                          ? formatDisplayTime(reservation.startTime)
                          : `${formatDisplayTime(reservation.startTime)} - ${formatDisplayTime(reservation.endTime)}`
                        }
                      </p>
                      {reservation.partySize > 1 && (
                        <p className="text-sm text-gray-500">
                          人数: {reservation.partySize}
                        </p>
                      )}
                      {reservation.notes && (
                        <p className="mt-1 text-sm text-gray-500">
                          备注: {reservation.notes}
                        </p>
                      )}
                    </div>
                    <div>
                      <CancelReservationButton 
                        reservationId={reservation.id} 
                        reservationType={reservation.type} 
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-5 sm:px-6 text-center">
              <p className="text-sm text-gray-500">
                您没有已确认的预约
              </p>
              <p className="mt-2 text-sm text-gray-400">
                使用上面的预约卡片来预订您的下次访问！
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Waitlisted Reservations */}
      {waitlistedReservations.length > 0 && (
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              Waitlist预约
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              如果有位置空出，我们会通知您
            </p>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {waitlistedReservations.map((reservation: any) => (
                <li key={reservation.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600 capitalize">
                        {getChineseReservationType(reservation.type)} (等候名单)
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatChineseDate(reservation.date)}{" "}
                        {reservation.type === 'poker' 
                          ? formatDisplayTime(reservation.startTime)
                          : `${formatDisplayTime(reservation.startTime)} - ${formatDisplayTime(reservation.endTime)}`
                        }
                      </p>
                      {reservation.partySize > 1 && (
                        <p className="text-sm text-gray-500">
                          人数: {reservation.partySize}
                        </p>
                      )}
                    </div>
                    <div>
                      <CancelReservationButton 
                        reservationId={reservation.id} 
                        reservationType={`${reservation.type} waitlist`} 
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}
