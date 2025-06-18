import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, ShieldExclamationIcon, UserPlusIcon, DocumentTextIcon, TrashIcon } from '@heroicons/react/24/outline';

interface AdminActionsProps {
  userId: string;
  onMakeAdmin: () => void;
  onBlock: () => void;
  onDelete: () => void;
  onHistory: () => void;
  isBlocked?: boolean;
}

const AdminActions = ({ onMakeAdmin, onBlock, onDelete, onHistory, isBlocked }: AdminActionsProps) => {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-center items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
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
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onMakeAdmin}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } flex w-full items-center px-4 py-2 text-sm`}
                >
                  <UserPlusIcon className="mr-3 h-5 w-5 text-indigo-600" aria-hidden="true" />
                  Сделать админом
                </button>
              )}
            </Menu.Item>
            
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onBlock}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } flex w-full items-center px-4 py-2 text-sm`}
                >
                  <ShieldExclamationIcon className="mr-3 h-5 w-5 text-orange-600" aria-hidden="true" />
                  {isBlocked ? 'Разблокировать' : 'Заблокировать'}
                </button>
              )}
            </Menu.Item>
            
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onHistory}
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } flex w-full items-center px-4 py-2 text-sm`}
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
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } flex w-full items-center px-4 py-2 text-sm text-red-600`}
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

export default AdminActions; 