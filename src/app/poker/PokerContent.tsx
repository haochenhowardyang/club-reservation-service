"use client";

import WhitelistWrapper from "@/components/WhitelistWrapper";
import PokerGameList from "./PokerGameList";
import { Session } from "next-auth";
import { useRouter } from "next/navigation";

interface PokerGame {
  id: number;
  date: string;
  startTime: string;
  endTime: string | null;
  status: "open" | "closed";
  notes?: string | null;
  userWaitlistPosition: number;
}

interface PokerContentProps {
  session: Session;
  games: PokerGame[];
}

export default function PokerContent({ session, games }: PokerContentProps) {
  const router = useRouter();
  // Check if user has too many strikes
  if (session.user.strikes >= 3) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  预约受限
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    由于多次未到，您的账户已被限制
                    请联系管理员恢复您的预约权限
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WhitelistWrapper type="member">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Lucky Poker Best Poker</h1>
            <p className="mt-1 text-sm text-gray-500">
              预约德州扑克
            </p>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">
                德州扑克预约规则
              </h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Waitlist</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    报名参加请加入waitlist，管理员将从waitlist中邀请玩家
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">确认</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    玩家将在受邀请后收到短信链接，请在四个小时内确认参加
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">准时性</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    请准时参加已接受的游戏，如不能参加请提前取消预订，未提前说明的缺席将影响之后的受邀机会
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg leading-6 font-medium text-gray-900">
                  德州扑克
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  加入牌局waitlist
                </p>
              </div>
              <button
                onClick={() => router.refresh()}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm leading-5 font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新
              </button>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              {games.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">暂无即将到来的德州扑克游戏</h3>
                  <p className="mt-1 text-sm text-gray-500">请稍后查看新游戏</p>
                </div>
              ) : (
                <PokerGameList userId={session.user.id} games={games} />
              )}
            </div>
          </div>
        </div>
      </div>
    </WhitelistWrapper>
  );
}
