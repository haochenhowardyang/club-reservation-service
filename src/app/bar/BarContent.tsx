"use client";

import WhitelistWrapper from "@/components/WhitelistWrapper";
import BarReservationForm from "@/components/BarReservationForm";
import { Session } from "next-auth";

interface BarContentProps {
  session: Session;
  minDate: string;
  maxDate: string;
}

export default function BarContent({ session, minDate, maxDate }: BarContentProps) {
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
            <h1 className="text-2xl font-bold text-gray-900">犯醉现场</h1>
            <p className="mt-1 text-sm text-gray-500">
              预约HomeBar
            </p>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">
                酒吧预约规则
              </h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">营业时间</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <p>周一至周五下午6:00 - 凌晨2:00，周末中午12:00 - 凌晨2:00</p>
                    <p>预约开始时间必须在凌晨12点之前</p>
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">时间限制</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    少于3人时最多限时2小时
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">提前预约</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    可提前最多2周预约
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">取消政策</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <p>如果无法赴约，请提前取消预约</p>
                    <p>三次未到将导致一周的预约限制</p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">
                预约信息
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                请选择您的酒吧预约日期和时间
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <BarReservationForm 
                minDate={minDate}
                maxDate={maxDate}
                userId={session.user.id}
              />
            </div>
          </div>
        </div>
      </div>
    </WhitelistWrapper>
  );
}
