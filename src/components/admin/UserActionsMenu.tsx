import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, ShieldExclamationIcon, UserPlusIcon, UserMinusIcon, LockClosedIcon, LockOpenIcon, DocumentTextIcon, TrashIcon } from '@heroicons/react/24/outline';

interface UserActionsMenuProps {
  userId: string;
  userName: string;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onDelete: () => void;
  onHistory: () => void;
  isAdmin: boolean;
  isBlocked: boolean;
  isProcessing?: boolean;
}

const UserActionsMenu = ({ 
  onMakeAdmin,
  onRemoveAdmin,
  onBlock,
  onUnblock,
  onDelete,
  onHistory,
  isAdmin,
  isBlocked,
  isProcessing = false
}: UserActionsMenuProps) => {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-center items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" disabled={isProcessing}>
          <ShieldExclamationIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Действия
          <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {isAdmin ? (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onRemoveAdmin}
                    disabled={isProcessing}
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } flex w-full items-center px-4 py-2 text-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <UserMinusIcon className="mr-3 h-5 w-5 text-red-600" aria-hidden="true" />
                    Снять права администратора
                  </button>
                )}
              </Menu.Item>
            ) : (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onMakeAdmin}
                    disabled={isProcessing}
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } flex w-full items-center px-4 py-2 text-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <UserPlusIcon className="mr-3 h-5 w-5 text-indigo-600" aria-hidden="true" />
                    Сделать администратором
                  </button>
                )}
              </Menu.Item>
            )}
            
            {!isAdmin && (
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={isBlocked ? onUnblock : onBlock}
                    disabled={isProcessing}
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } flex w-full items-center px-4 py-2 text-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isBlocked ? (
                      <>
                        <LockOpenIcon className="mr-3 h-5 w-5 text-green-600" aria-hidden="true" />
                        Разблокировать
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className="mr-3 h-5 w-5 text-orange-600" aria-hidden="true" />
                        Заблокировать
                      </>
                    )}
                  </button>
                )}
              </Menu.Item>
            )}
            
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onHistory}
                  disabled={isProcessing}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } flex w-full items-center px-4 py-2 text-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <DocumentTextIcon className="mr-3 h-5 w-5 text-gray-600" aria-hidden="true" />
                  История
                </button>
              )}
            </Menu.Item>
            
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onDelete}
                  disabled={isProcessing}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } flex w-full items-center px-4 py-2 text-sm text-red-600 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <TrashIcon className="mr-3 h-5 w-5 text-red-600" aria-hidden="true" />
                  Удалить
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default UserActionsMenu; 