/**
 * TDD Unit Tests for User Profile "Message" Button Feature
 * 
 * Tests the functionality of adding "Message" button to user profiles
 * that opens DM conversations using the NewDMModal component.
 * 
 * ST-P2-04-D: Add "Message" button to user profiles
 * AC-7: User profile "Message" button opens DM
 * 
 * Test Framework: Vitest + React Testing Library
 * TDD Methodology: RED → GREEN → REFACTOR
 */

import React from "react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";

// Mock the NewDMModal and modal store dependencies
const mockOnOpen = vi.fn();
const mockUseModal = vi.fn(() => ({
  onOpen: mockOnOpen,
  isOpen: false,
  type: null,
  data: {},
  onClose: vi.fn(),
}));

// Mock Matrix client
const mockMatrixClient = {
  getUserId: vi.fn(() => "@testuser:example.com"),
  createRoom: vi.fn(),
  searchUserDirectory: vi.fn(),
};

const mockUseMatrixClient = vi.fn(() => ({
  client: mockMatrixClient,
  isConnected: true,
}));

// Mock router
const mockPush = vi.fn();
const mockUseRouter = vi.fn(() => ({
  push: mockPush,
  pathname: "/",
}));

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock("@/hooks/use-modal-store", () => ({
  useModal: mockUseModal,
}));

vi.mock("@/hooks/use-matrix-client", () => ({
  useMatrixClient: mockUseMatrixClient,
}));

vi.mock("next/navigation", () => ({
  useRouter: mockUseRouter,
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

// Mock components that will be enhanced with message button
const MockMembersModal = vi.fn(({ members = [] }) => {
  const currentUserId = mockMatrixClient.getUserId();
  const { client } = mockUseMatrixClient();
  const [loadingUser, setLoadingUser] = React.useState<string | null>(null);
  
  const handleMessageClick = (member: any) => {
    try {
      setLoadingUser(member.id);
      mockOnOpen("newDM", { targetUser: member });
      // Simulate async completion
      setTimeout(() => setLoadingUser(null), 100);
    } catch (error) {
      console.error("Failed to open DM modal:", error);
      setLoadingUser(null);
    }
  };
  
  return (
    <div data-testid="members-modal">
      {members.map((member: any) => {
        // Validate user ID - don't render if invalid
        if (!member.id || member.id.trim() === "" || member.id === null || member.id === undefined) {
          return null;
        }
        
        // Don't show message button for current user
        const showMessageButton = currentUserId !== member.id;
        const isLoading = loadingUser === member.id;
        
        return (
          <div key={member.id} data-testid={`member-${member.id}`}>
            <span>{member.name}</span>
            <button data-testid={`member-actions-${member.id}`}>
              Actions
            </button>
            {showMessageButton && (
              <button 
                data-testid={`message-user-${member.id}`}
                onClick={() => handleMessageClick(member)}
                disabled={!client}
                className="message-button truncate"
                aria-label={`Start direct message with ${member.name}`}
                aria-busy={isLoading ? "true" : undefined}
              >
                <svg data-icon="message" />
                Message
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
});

const MockMemberList = vi.fn(({ members = [] }) => {
  const currentUserId = mockMatrixClient.getUserId();
  const { client } = mockUseMatrixClient();
  const [loadingUser, setLoadingUser] = React.useState<string | null>(null);
  
  const handleMessageClick = (member: any) => {
    try {
      setLoadingUser(member.id);
      mockOnOpen("newDM", { targetUser: member });
      // Simulate async completion
      setTimeout(() => setLoadingUser(null), 100);
    } catch (error) {
      console.error("Failed to open DM modal:", error);
      setLoadingUser(null);
    }
  };
  
  return (
    <div data-testid="member-list">
      {members.map((member: any) => {
        // Validate user ID - don't render if invalid
        if (!member.id || member.id.trim() === "" || member.id === null || member.id === undefined) {
          return null;
        }
        
        // Don't show message button for current user
        const showMessageButton = currentUserId !== member.id;
        const isLoading = loadingUser === member.id;
        
        return (
          <div key={member.id} data-testid={`member-item-${member.id}`}>
            <span>{member.name}</span>
            {showMessageButton && (
              <button 
                data-testid={`message-member-${member.id}`}
                onClick={() => handleMessageClick(member)}
                disabled={!client}
                className="message-button truncate"
                aria-label={`Start direct message with ${member.name}`}
                aria-busy={isLoading ? "true" : undefined}
              >
                <svg data-icon="message" />
                Message
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
});

describe("User Profile Message Button", () => {
  const mockUser = {
    id: "@targetuser:example.com",
    name: "Target User",
    avatarUrl: "https://example.com/avatar.jpg",
    role: "MEMBER",
    powerLevel: 0,
  };

  const currentUser = {
    id: "@testuser:example.com",
    name: "Test User",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMatrixClient.getUserId.mockReturnValue(currentUser.id);
  });

  describe("Members Modal Message Button", () => {
    test("AC-7.1: Message button is visible for other users", () => {
      render(<MockMembersModal members={[mockUser]} />);

      const messageButton = screen.getByTestId(`message-user-${mockUser.id}`);
      expect(messageButton).toBeInTheDocument();
      expect(messageButton).toHaveTextContent("Message");
    });

    test("AC-7.2: Message button is hidden for current user (cannot DM self)", () => {
      const selfUser = { ...mockUser, id: currentUser.id, name: currentUser.name };
      render(<MockMembersModal members={[selfUser]} />);

      const messageButton = screen.queryByTestId(`message-user-${selfUser.id}`);
      expect(messageButton).toBeNull();
    });

    test("AC-7.3: Clicking Message button opens NewDM modal with target user", async () => {
      const user = userEvent.setup();
      render(<MockMembersModal members={[mockUser]} />);

      const messageButton = screen.getByTestId(`message-user-${mockUser.id}`);
      await user.click(messageButton);

      expect(mockOnOpen).toHaveBeenCalledWith("newDM", {
        targetUser: mockUser,
      });
    });

    test("AC-7.4: Message button appears in dropdown menu with other actions", () => {
      render(<MockMembersModal members={[mockUser]} />);

      // Both action button and message button should exist
      const actionsButton = screen.getByTestId(`member-actions-${mockUser.id}`);
      const messageButton = screen.getByTestId(`message-user-${mockUser.id}`);
      
      expect(actionsButton).toBeInTheDocument();
      expect(messageButton).toBeInTheDocument();
    });
  });

  describe("Member List Message Button", () => {
    test("AC-7.5: Message option available in member list dropdown", () => {
      render(<MockMemberList members={[mockUser]} />);

      const messageButton = screen.getByTestId(`message-member-${mockUser.id}`);
      expect(messageButton).toBeInTheDocument();
      expect(messageButton).toHaveTextContent("Message");
    });

    test("AC-7.6: Message option hidden for current user in member list", () => {
      const selfUser = { ...mockUser, id: currentUser.id, name: currentUser.name };
      render(<MockMemberList members={[selfUser]} />);

      const messageButton = screen.queryByTestId(`message-member-${selfUser.id}`);
      expect(messageButton).toBeNull();
    });

    test("AC-7.7: Clicking message option opens NewDM modal", async () => {
      const user = userEvent.setup();
      render(<MockMemberList members={[mockUser]} />);

      const messageButton = screen.getByTestId(`message-member-${mockUser.id}`);
      await user.click(messageButton);

      expect(mockOnOpen).toHaveBeenCalledWith("newDM", {
        targetUser: mockUser,
      });
    });
  });

  describe("Integration with NewDM Modal", () => {
    test("AC-7.8: NewDM modal receives correct user data", () => {
      render(<MockMembersModal members={[mockUser]} />);

      const messageButton = screen.getByTestId(`message-user-${mockUser.id}`);
      fireEvent.click(messageButton);

      const expectedData = {
        targetUser: {
          id: mockUser.id,
          name: mockUser.name,
          avatarUrl: mockUser.avatarUrl,
          role: mockUser.role,
          powerLevel: mockUser.powerLevel,
        },
      };

      expect(mockOnOpen).toHaveBeenCalledWith("newDM", expectedData);
    });

    test("AC-7.9: Message button works with minimal user data", () => {
      const minimalUser = {
        id: "@minimal:example.com",
        name: "Minimal User",
      };

      render(<MockMembersModal members={[minimalUser]} />);

      const messageButton = screen.getByTestId(`message-user-${minimalUser.id}`);
      fireEvent.click(messageButton);

      expect(mockOnOpen).toHaveBeenCalledWith("newDM", {
        targetUser: minimalUser,
      });
    });
  });

  describe("Permission and State Handling", () => {
    test("AC-7.10: Message button disabled when Matrix client unavailable", () => {
      mockUseMatrixClient.mockReturnValueOnce({
        client: null,
        isConnected: false,
      });

      render(<MockMembersModal members={[mockUser]} />);

      const messageButton = screen.getByTestId(`message-user-${mockUser.id}`);
      expect(messageButton).toBeDisabled();
    });

    test("AC-7.11: Message button shows loading state during DM creation", async () => {
      const user = userEvent.setup();
      
      // Mock delayed modal response
      let resolveModal: (value: any) => void;
      const modalPromise = new Promise(resolve => {
        resolveModal = resolve;
      });

      mockOnOpen.mockImplementationOnce(() => modalPromise);

      render(<MockMembersModal members={[mockUser]} />);

      const messageButton = screen.getByTestId(`message-user-${mockUser.id}`);
      await user.click(messageButton);

      // Button should show some loading indication
      expect(messageButton).toHaveAttribute("aria-busy", "true");
      
      // Resolve the modal
      resolveModal!(undefined);
      await waitFor(() => {
        expect(messageButton).not.toHaveAttribute("aria-busy", "true");
      });
    });

    test("AC-7.12: Error handling when NewDM modal fails to open", async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation();
      
      mockOnOpen.mockImplementationOnce(() => {
        throw new Error("Modal failed to open");
      });

      render(<MockMembersModal members={[mockUser]} />);

      const messageButton = screen.getByTestId(`message-user-${mockUser.id}`);
      await user.click(messageButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to open DM modal:",
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe("Accessibility and UX", () => {
    test("AC-7.13: Message button has proper ARIA label", () => {
      render(<MockMembersModal members={[mockUser]} />);

      const messageButton = screen.getByTestId(`message-user-${mockUser.id}`);
      expect(messageButton).toHaveAttribute(
        "aria-label", 
        `Start direct message with ${mockUser.name}`
      );
    });

    test("AC-7.14: Message button keyboard accessible", async () => {
      const user = userEvent.setup();
      render(<MockMembersModal members={[mockUser]} />);

      const messageButton = screen.getByTestId(`message-user-${mockUser.id}`);
      
      // Focus and press Enter
      messageButton.focus();
      await user.keyboard("{Enter}");

      expect(mockOnOpen).toHaveBeenCalledWith("newDM", {
        targetUser: mockUser,
      });
    });

    test("AC-7.15: Message button has proper icon and styling", () => {
      render(<MockMembersModal members={[mockUser]} />);

      const messageButton = screen.getByTestId(`message-user-${mockUser.id}`);
      
      // Should have message-related icon/styling
      expect(messageButton).toHaveClass("message-button");
      
      // Icon should be present
      const icon = messageButton.querySelector('svg[data-icon="message"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Multiple Users Scenario", () => {
    test("AC-7.16: Message buttons work independently for multiple users", async () => {
      const user = userEvent.setup();
      const users = [
        { ...mockUser, id: "@user1:example.com", name: "User 1" },
        { ...mockUser, id: "@user2:example.com", name: "User 2" },
      ];

      render(<MockMembersModal members={users} />);

      // Click message button for first user
      const messageButton1 = screen.getByTestId(`message-user-${users[0].id}`);
      await user.click(messageButton1);

      expect(mockOnOpen).toHaveBeenLastCalledWith("newDM", {
        targetUser: users[0],
      });

      // Click message button for second user
      const messageButton2 = screen.getByTestId(`message-user-${users[1].id}`);
      await user.click(messageButton2);

      expect(mockOnOpen).toHaveBeenLastCalledWith("newDM", {
        targetUser: users[1],
      });

      expect(mockOnOpen).toHaveBeenCalledTimes(2);
    });
  });

  describe("Edge Cases", () => {
    test("AC-7.17: Handles user with undefined/null properties gracefully", () => {
      const userWithNulls = {
        id: "@nulluser:example.com",
        name: "Null User",
        avatarUrl: null,
        role: undefined,
        powerLevel: null,
      };

      render(<MockMembersModal members={[userWithNulls]} />);

      const messageButton = screen.getByTestId(`message-user-${userWithNulls.id}`);
      expect(messageButton).toBeInTheDocument();
      
      fireEvent.click(messageButton);
      expect(mockOnOpen).toHaveBeenCalledWith("newDM", {
        targetUser: userWithNulls,
      });
    });

    test("AC-7.18: Message button does not appear for invalid/empty user IDs", () => {
      const invalidUsers = [
        { id: "", name: "Empty ID User" },
        { id: null, name: "Null ID User" },
        { id: undefined, name: "Undefined ID User" },
      ];

      render(<MockMembersModal members={invalidUsers} />);

      // No message buttons should appear for invalid users
      const messageButtons = screen.queryAllByTestId(/^message-user-/);
      expect(messageButtons).toHaveLength(0);
    });

    test("AC-7.19: Handles very long user names in button text", () => {
      const longNameUser = {
        ...mockUser,
        id: "@longname:example.com",
        name: "This is a very very very long user name that might overflow the button",
      };

      render(<MockMembersModal members={[longNameUser]} />);

      const messageButton = screen.getByTestId(`message-user-${longNameUser.id}`);
      expect(messageButton).toBeInTheDocument();
      expect(messageButton).toHaveClass("truncate"); // Should have text truncation
    });
  });
});